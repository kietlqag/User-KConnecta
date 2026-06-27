import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  MessageCircle,
  Share2,
  Globe,
  Users,
  Lock,
  Images,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { postService, SAVED_POSTS_CHANGED_EVENT, type PostReactionCountResponse, type PostResponse, type ReactionType } from '@/services/postService';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { UserAvatar } from './UserAvatar';
import { PostDetailModal } from '../posts/PostDetailModal';
import { PostShareModal } from '../posts/PostShareModal';
import { EditPostModal } from '../posts/EditPostModal';
import { LivePostPreviewCard } from './LivePostPreviewCard';
import {
  buildInitialReactionCounts,
  getActiveReactions,
  getTotalReactionCount,
  mapReactionCounts,
  ReactionButton,
  ReactionSummaryDialog,
  reactions,
  type ReactionCountMap,
  type ReactionOption,
  updateReactionCounts,
} from '../reactions';
import { formatScheduledPostLabel, formatPostTimestamp } from '@/utils/postUtils';
import { POSTS_FEED_KEY } from '@/features/home/hooks/usePosts';
import { getScrollTop, setScrollTop } from '@/features/home/utils/scrollToHomeTop';
import { PostMoreMenu, type Privacy } from './PostMoreMenu';
import { PostPollCard } from '../posts/PostPollCard';
import type { PostPollResponse } from '@/services/postService';
import { PostMediaGallery, type PostGalleryItem } from './PostMediaGallery';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function PostPrivacyIcon({ privacy, className = 'w-3 h-3' }: { privacy: Privacy; className?: string }) {
  if (privacy === 'PRIVATE') {
    return <Lock className={className} aria-label="Chỉ mình tôi" />;
  }
  if (privacy === 'PUBLIC') {
    return <Globe className={className} aria-label="Công khai" />;
  }
  return <Users className={className} aria-label="Bạn bè" />;
}

interface Author {
  id: string;
  name: string;
  avatar: string;
}

interface Group {
  id: string;
  name: string;
  icon?: string;
}

interface Media {
  type: 'image' | 'video';
  url: string;
}

interface Comment {
  id: string;
  author: Author;
  content: string;
  timestamp: string;
  reactions: number;
}

export interface PostProps {
  id: string;
  author: Author;
  timestamp: string;
  content: string;
  image?: string;
  media?: Media;
  likes: number;
  comments: number;
  shares: number;
  isLiked?: boolean;
  isSaved?: boolean;
  currentUserReactionType?: ReactionType | null;
  reactionCounts?: PostReactionCountResponse[];
  // Share-wrapper fields
  sharedPost?: boolean;
  originalPost?: PostProps;
  // Embedded group card (present when this post shares a group to the feed)
  sharedGroup?: {
    id: string;
    name: string;
    coverPhotoUrl?: string;
    privacy: 'PUBLIC' | 'PRIVATE';
    memberCount: number;
  };
  sharedAlbum?: {
    id: string;
    title: string;
    coverUrl?: string;
    mediaCount: number;
    ownerName: string;
  };
  group?: Group;
  commentsData?: Comment[];
  mediaList?: { type: 'IMAGE' | 'VIDEO' | 'DOCUMENT'; url: string }[];
  isLivePost?: boolean;
  privacy?: Privacy;
  excludedUserIds?: string[];
  allowedUserIds?: string[];
  onDelete?: (postId: string) => void;
  onReactionChange?: (postId: string, reactionType: ReactionType | null) => void;
  // Group context: admin can pin/unpin this post to the group's featured area.
  canPin?: boolean;
  isPinned?: boolean;
  onPin?: (postId: string) => void;
  onUnpin?: (postId: string) => void;
  poll?: PostPollResponse | null;
  status?: 'PUBLISHED' | 'SCHEDULED' | 'DRAFT' | 'HIDDEN' | 'DELETED';
  scheduledAt?: string | null;
  /** Narrower layout for search results and similar embedded views. */
  compact?: boolean;
  /** Stretch the card to fill its container height (for equal-height grids). */
  fillHeight?: boolean;
  onPostUpdated?: (post: PostResponse) => void;
}

export function Post({
  id,
  author,
  timestamp,
  content,
  image,
  media,
  likes,
  comments,
  shares,
  isLiked: initialIsLiked = false,
  isSaved: initialIsSaved = false,
  currentUserReactionType = null,
  reactionCounts: serverReactionCounts,
  group,
  mediaList = [],
  isLivePost = false,
  privacy: initialPrivacy = 'PUBLIC',
  excludedUserIds: initialExcludedUserIds = [],
  allowedUserIds: initialAllowedUserIds = [],
  onDelete,
  onReactionChange,
  canPin = false,
  isPinned = false,
  onPin,
  onUnpin,
  sharedPost = false,
  originalPost,
  sharedGroup,
  sharedAlbum,
  poll,
  status: initialStatus,
  scheduledAt: initialScheduledAt,
  compact = false,
  fillHeight = false,
  onPostUpdated,
}: PostProps) {
  // For share wrappers, save/share actions target the original post; interactions use the wrapper id.
  const originalPostId = sharedPost && originalPost ? originalPost.id : id;
  const liveSource = sharedPost && originalPost?.isLivePost
    ? { postId: originalPost.id, authorId: originalPost.author.id, content: originalPost.content }
    : isLivePost
      ? { postId: id, authorId: author.id, content }
      : null;
  const hasLivePreview = Boolean(liveSource);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(initialIsLiked || !!currentUserReactionType);
  const [likeCount, setLikeCount] = useState(likes);
  const [commentCount, setCommentCount] = useState(comments);
  const [shareCount, setShareCount] = useState(shares);
  const [selectedReaction, setSelectedReaction] = useState<ReactionOption | null>(
    currentUserReactionType
      ? reactions.find((item) => item.type === currentUserReactionType) ?? null
      : null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReactionSummaryOpen, setIsReactionSummaryOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteScrollYRef = useRef(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [displayContent, setDisplayContent] = useState(content);
  const [displayMediaList, setDisplayMediaList] = useState(mediaList);
  const [currentPrivacy, setCurrentPrivacy] = useState<Privacy>(initialPrivacy);
  const [excludedUserIds, setExcludedUserIds] = useState<string[]>(initialExcludedUserIds);
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>(initialAllowedUserIds);
  const [postStatus, setPostStatus] = useState(initialStatus);
  const [displayTimestamp, setDisplayTimestamp] = useState(timestamp);
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    setPostStatus(initialStatus);
    setDisplayTimestamp(timestamp);
  }, [initialStatus, timestamp, id]);

  useEffect(() => {
    setDisplayContent(content);
    setDisplayMediaList(mediaList);
  }, [content, mediaList, id]);

  useEffect(() => {
    setCurrentPrivacy(initialPrivacy);
    setExcludedUserIds(initialExcludedUserIds);
    setAllowedUserIds(initialAllowedUserIds);
  }, [initialPrivacy, initialExcludedUserIds, initialAllowedUserIds, id]);
  const isOwner = !!currentUser && currentUser.id === author.id;
  const isScheduled = postStatus === 'SCHEDULED';
  const canEditPost = isOwner && !hasLivePreview;

  const openDeleteDialog = useCallback(() => {
    deleteScrollYRef.current = getScrollTop();
    setDeleteDialogOpen(true);
  }, []);

  useEffect(() => {
    if (!deleteDialogOpen) return;
    const restore = () => setScrollTop(deleteScrollYRef.current);
    restore();
    const raf = requestAnimationFrame(restore);
    const timers = [0, 16, 50, 100].map((ms) => window.setTimeout(restore, ms));
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [deleteDialogOpen]);
  const [reactionCounts, setReactionCounts] = useState<ReactionCountMap>(() =>
    mapReactionCounts(
      serverReactionCounts,
      buildInitialReactionCounts(likes, currentUserReactionType),
    ),
  );

  // Lightbox State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxRotation, setLightboxRotation] = useState(0);

  const galleryItems = useMemo((): PostGalleryItem[] => {
    const raw: PostGalleryItem[] =
      displayMediaList.length > 0
        ? displayMediaList
        : media?.url
          ? [{ type: media.type === 'video' ? 'VIDEO' : 'IMAGE', url: media.url }]
          : image
            ? [{ type: 'IMAGE', url: image }]
            : [];
    return raw.filter((x) => Boolean(x.url?.trim()));
  }, [displayMediaList, media, image]);

  const imagesOnly = useMemo(
    () => galleryItems.filter((m) => m.type === 'IMAGE').map((m) => m.url),
    [galleryItems],
  );

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxZoom(1);
    setLightboxRotation(0);
    setIsLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
  }, []);

  const prevImage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxIndex(prev => (prev === 0 ? imagesOnly.length - 1 : prev - 1));
  }, [imagesOnly.length]);

  const nextImage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxIndex(prev => (prev === imagesOnly.length - 1 ? 0 : prev + 1));
  }, [imagesOnly.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, closeLightbox, prevImage, nextImage]);

  useEffect(() => {
    if (isLightboxOpen) {
      setLightboxZoom(1);
      setLightboxRotation(0);
    }
  }, [lightboxIndex, isLightboxOpen]);

  // Handle scroll lock
  useEffect(() => {
    const scrollableEl = document.querySelector('#root') as HTMLElement;
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      if (scrollableEl) scrollableEl.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      if (scrollableEl) scrollableEl.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      if (scrollableEl) scrollableEl.style.overflow = '';
    };
  }, [isLightboxOpen]);

  const firstItem = galleryItems[0];
  const mediaUrl = firstItem?.url;
  const mediaType = firstItem?.type === 'VIDEO'
    ? 'video'
    : firstItem?.type === 'DOCUMENT'
      ? 'document'
      : 'image';
  const activeReactions = getActiveReactions(reactionCounts);
  const totalReactionCount = getTotalReactionCount(reactionCounts);

  const postData = useMemo(
    () => ({
      id,
      author: {
        name: author.name,
        avatar: author.avatar,
      },
      content: displayContent,
      timestamp,
      likes: likeCount,
      comments: commentCount,
      shares: shareCount,
      image: mediaUrl,
      media: mediaUrl ? { type: mediaType, url: mediaUrl } as const : undefined,
      mediaList: galleryItems.length > 1 ? galleryItems : undefined,
      reactionCounts,
      privacy: currentPrivacy,
      excludedUserIds,
      allowedUserIds,
      groupId: group?.id,
      isOwner,
      currentUserId: currentUser?.id,
    }),
    [
      author.avatar,
      author.name,
      commentCount,
      displayContent,
      currentPrivacy,
      excludedUserIds,
      allowedUserIds,
      currentUser?.id,
      galleryItems,
      id,
      isOwner,
      likeCount,
      mediaUrl,
      mediaType,
      reactionCounts,
      shareCount,
      timestamp,
      group?.id,
    ],
  );

  const handleReactionChange = async (reaction: ReactionOption | null) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để thả cảm xúc');
      return;
    }

    try {
      setIsReacting(true);
      if (!reaction) {
        if (!selectedReaction) {
          return;
        }

        await postService.removeReaction(id, currentUser.id);
        setReactionCounts((prev) => ({
          ...prev,
          [selectedReaction.type]: Math.max(0, prev[selectedReaction.type] - 1),
        }));
        setSelectedReaction(null);
        setIsLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
        onReactionChange?.(id, null);
      } else {
        await postService.addReaction(id, {
          userId: currentUser.id,
          reactionType: reaction.type as ReactionType,
        });

        setReactionCounts((prev) =>
          updateReactionCounts(prev, selectedReaction?.type ?? null, reaction.type),
        );
        setSelectedReaction(reaction);
        if (!isLiked) {
          setIsLiked(true);
        }
        setLikeCount((prev) => (selectedReaction?.type ? prev : prev + 1));
        onReactionChange?.(id, reaction.type as ReactionType);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể thả cảm xúc');
    } finally {
      setIsReacting(false);
    }
  };

  const handleToggleSave = async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để lưu bài viết');
      return;
    }

    try {
      if (isSaved) {
        await postService.unsavePost(currentUser.id, originalPostId);
        setIsSaved(false);
        toast.success('Đã bỏ lưu bài viết.');
      } else {
        await postService.savePost(currentUser.id, originalPostId);
        setIsSaved(true);
        toast.success('Đã lưu bài viết vào danh sách mục đã lưu.');
      }
      window.dispatchEvent(new CustomEvent(SAVED_POSTS_CHANGED_EVENT, { detail: { postId: id, saved: !isSaved } }));
    } catch {
      toast.error('Không thể thực hiện thao tác. Vui lòng thử lại sau.');
    }
  };

  const performDelete = async () => {
    const user = authService.getCurrentUser();
    if (!user) return;
    try {
      setIsDeleting(true);
      await postService.deletePost(id, user.id);
      setDeleteDialogOpen(false);
      toast.success(sharedPost ? 'Đã gỡ bài chia sẻ' : 'Đã xóa bài viết');
      window.setTimeout(() => {
        removePostFromClientCaches(queryClient, user.id, id);
        onDelete?.(id);
      }, 150);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa bài viết');
    } finally {
      setIsDeleting(false);
    }
  };

  const mediaMaxClass = compact ? 'max-h-64' : 'max-h-[600px]';

  return (
    <>
      <div
        id={`post-${id}`}
        className={`bg-card shadow-sm border ${ isScheduled ? 'border-amber-300/70 dark:border-amber-700/50' : 'border-border' } ${ compact ? 'rounded-xl' : 'rounded-2xl' } ${fillHeight ? 'flex h-full flex-col' : compact ? 'mb-2' : 'mb-4'}`}
      >
        {isScheduled && (
          <div className="flex items-center gap-2 border-b border-amber-200/60 bg-amber-50/80 px-4 py-2 text-sm font-medium text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            <span>{displayTimestamp}</span>
          </div>
        )}
        <div className={compact ? 'p-3' : 'p-4'}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 group">
              <div className="relative">
                {group ? (
                  <>
                    {group.icon ? (
                      <ImageWithFallback
                        src={group.icon}
                        alt={group.name}
                        className="w-10 h-10 object-cover cursor-pointer rounded-lg shadow-sm"
                        onClick={() => navigate(`/groups/${group.id}`)}
                      />
                    ) : (
                      <div
                        className="cursor-pointer"
                        onClick={() => navigate(`/groups/${group.id}`)}
                      >
                        <UserAvatar
                          name={group.name}
                          userId={group.id}
                          className="w-10 h-10"
                          rounded="lg"
                          initialsClassName="text-sm font-bold"
                        />
                      </div>
                    )}
                    <div
                      className="absolute -bottom-1 -right-1 cursor-pointer"
                      onClick={() => navigate(`/profile/${author.id}`)}
                    >
                      <UserAvatar
                        name={author.name}
                        avatarUrl={author.avatar}
                        userId={author.id}
                        className="w-6 h-6 border-2 border-card shadow-sm"
                        rounded="full"
                        initialsClassName="text-[10px] font-bold"
                      />
                    </div>
                  </>
                ) : (
                  <div
                    className="cursor-pointer"
                    onClick={() => navigate(`/profile/${author.id}`)}
                  >
                    <UserAvatar
                      name={author.name}
                      avatarUrl={author.avatar}
                      userId={author.id}
                      className="w-10 h-10"
                      rounded="full"
                      initialsClassName="text-sm font-bold"
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <h3
                  className="font-bold text-[15px] text-foreground cursor-pointer hover:underline leading-tight"
                  onClick={() => group ? navigate(`/groups/${group.id}`) : navigate(`/profile/${author.id}`)}
                >
                  {group?.name || author.name}
                </h3>
                <div className="flex items-center gap-1 text-[13px] text-muted-foreground leading-tight flex-wrap">
                  {sharedPost && originalPost ? (
                    <>
                      <span>đã chia sẻ bài viết của</span>
                      <span
                        className="font-semibold text-foreground hover:underline cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); navigate(`/profile/${originalPost.author.id}`); }}
                      >
                        {originalPost.author.name}
                      </span>
                      <span>·</span>
                    </>
                  ) : group ? (
                    <>
                      <span
                        className="hover:underline cursor-pointer"
                        onClick={() => navigate(`/profile/${author.id}`)}
                      >
                        {author.name}
                      </span>
                      <span>·</span>
                    </>
                  ) : null}
                  {!isScheduled && (
                    <>
                      <span>{displayTimestamp}</span>
                      <span>·</span>
                    </>
                  )}
                  <PostPrivacyIcon privacy={currentPrivacy} />
                </div>
              </div>
            </div>
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <PostMoreMenu
                postId={id}
                isSaved={isSaved}
                isOwner={isOwner}
                isGroupPost={!!group}
                currentUserId={currentUser?.id}
                onToggleSave={handleToggleSave}
                onEdit={canEditPost ? () => setEditModalOpen(true) : undefined}
                onDelete={openDeleteDialog}
                canPin={canPin}
                isPinned={isPinned}
                onPin={onPin ? () => onPin(id) : undefined}
                onUnpin={onUnpin ? () => onUnpin(id) : undefined}
              />
            </div>
          </div>

          {(displayContent && !hasLivePreview) || (sharedPost && displayContent) ? (
            <p className="text-foreground mb-3 whitespace-pre-wrap">{displayContent}</p>
          ) : null}

          {poll && !sharedPost && !isScheduled && (
            <PostPollCard
              postId={id}
              poll={poll}
              canManageOptions={isOwner || canPin}
            />
          )}

          {/* Embedded original post card for share wrappers */}
          {sharedPost && originalPost && (() => {
            const origMediaUrl = originalPost.media?.url || originalPost.image;
            const origIsVideo = originalPost.media?.type === 'video' ||
              (originalPost.mediaList ?? []).some((m) => m.type === 'VIDEO');
            return (
              <div
                className="mt-1 mb-2 rounded-xl border border-border bg-muted overflow-hidden cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => navigate(`/home?post=${originalPost.id}`)}
              >
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="cursor-pointer shrink-0"
                      onClick={(e) => { e.stopPropagation(); navigate(`/profile/${originalPost.author.id}`); }}
                    >
                      <UserAvatar
                        name={originalPost.author.name}
                        avatarUrl={originalPost.author.avatar}
                        userId={originalPost.author.id}
                        className="w-8 h-8"
                        rounded="full"
                        initialsClassName="text-xs font-bold"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span
                        className="text-sm font-semibold text-foreground hover:underline cursor-pointer leading-tight"
                        onClick={(e) => { e.stopPropagation(); navigate(`/profile/${originalPost.author.id}`); }}
                      >
                        {originalPost.author.name}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground leading-tight">
                        <span>{originalPost.timestamp}</span>
                        <span>·</span>
                        <PostPrivacyIcon privacy={originalPost.privacy ?? 'PUBLIC'} />
                      </div>
                    </div>
                  </div>
                  {originalPost.isLivePost ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <LivePostPreviewCard
                        postId={originalPost.id}
                        authorId={originalPost.author.id}
                        content={originalPost.content}
                        compact
                      />
                    </div>
                  ) : (
                    originalPost.content && (
                      <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-4">{originalPost.content}</p>
                    )
                  )}
                </div>
                {!originalPost.isLivePost && origMediaUrl && (
                  origIsVideo ? (
                    <video
                      src={origMediaUrl}
                      controls
                      className="w-full max-h-64 object-contain bg-black"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <img
                      src={origMediaUrl}
                      alt="Nội dung gốc"
                      className="w-full max-h-64 object-cover"
                    />
                  )
                )}
              </div>
            );
          })()}

          {/* Embedded group card for "share group to feed" posts */}
          {sharedGroup && (
            <div
              className="mt-1 mb-2 rounded-xl border border-border bg-muted overflow-hidden cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => navigate(`/groups/${sharedGroup.id}`)}
            >
              {sharedGroup.coverPhotoUrl ? (
                <img
                  src={sharedGroup.coverPhotoUrl}
                  alt={sharedGroup.name}
                  className="w-full max-h-56 object-cover"
                />
              ) : (
                <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-100 dark:from-gray-700 dark:to-gray-800">
                  <Users className="h-10 w-10 text-emerald-500/70" aria-hidden />
                </div>
              )}
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">{sharedGroup.name}</p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {sharedGroup.privacy === 'PUBLIC' ? (
                      <Globe className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <Lock className="h-3.5 w-3.5" aria-hidden />
                    )}
                    <span>{sharedGroup.privacy === 'PUBLIC' ? 'Nhóm Công khai' : 'Nhóm Riêng tư'}</span>
                    <span aria-hidden>·</span>
                    <span>{sharedGroup.memberCount.toLocaleString('vi-VN')} thành viên</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate(`/groups/${sharedGroup.id}`); }}
                  className="shrink-0 rounded-lg bg-muted px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Xem nhóm
                </button>
              </div>
            </div>
          )}

          {sharedAlbum && (
            <div
              className="mt-1 mb-2 rounded-xl border border-border bg-muted overflow-hidden cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => navigate(`/albums/${sharedAlbum.id}`)}
            >
              {sharedAlbum.coverUrl ? (
                <img src={sharedAlbum.coverUrl} alt={sharedAlbum.title} className="w-full max-h-56 object-cover" />
              ) : (
                <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-violet-100 to-pink-100 dark:from-gray-700 dark:to-gray-800">
                  <Images className="h-10 w-10 text-violet-500/70" aria-hidden />
                </div>
              )}
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">{sharedAlbum.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {sharedAlbum.mediaCount} ảnh/video · {sharedAlbum.ownerName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate(`/albums/${sharedAlbum.id}`); }}
                  className="shrink-0 rounded-lg bg-muted px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Xem album
                </button>
              </div>
            </div>
          )}
        </div>

        {hasLivePreview && !sharedPost && !isModalOpen ? (
          <div className="px-4 pb-4">
            <LivePostPreviewCard
              postId={liveSource!.postId}
              authorId={liveSource!.authorId}
              content={liveSource!.content}
            />
          </div>
        ) : hasLivePreview && !sharedPost ? null : galleryItems.length >= 2 ? (
          <PostMediaGallery
            items={galleryItems}
            className={compact ? 'max-h-[min(280px,70vw)]' : undefined}
            altText={`Ảnh trong bài viết của ${author.name}`}
            onMediaClick={(itemIndex) => {
              const item = galleryItems[itemIndex];
              if (item.type !== 'IMAGE') return;
              let imgIdx = 0;
              for (let j = 0; j < itemIndex; j++) {
                if (galleryItems[j].type === 'IMAGE') imgIdx++;
              }
              openLightbox(imgIdx);
            }}
          />
        ) : mediaUrl ? (
          <div
            className={`relative bg-black ${mediaType === 'document' ? '' : 'cursor-pointer'}`}
            onClick={mediaType === 'document' ? undefined : () => openLightbox(0)}
          >
            {mediaType === 'image' ? (
              <ImageWithFallback
                src={mediaUrl}
                alt={`Ảnh trong bài viết của ${author.name}`}
                loading="lazy"
                className={`${mediaMaxClass} w-full object-contain`}
              />
            ) : mediaType === 'document' ? (
              <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${mediaMaxClass} flex w-full flex-col items-center justify-center gap-2 bg-slate-100 py-10 text-slate-800 dark:bg-slate-800 dark:text-slate-100`}
              >
                <span className="text-sm font-semibold">Tải tài liệu đính kèm</span>
              </a>
            ) : (
              <video
                src={mediaUrl}
                controls
                aria-label={`Video trong bài viết của ${author.name}`}
                className={`${mediaMaxClass} w-full object-contain`}
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        ) : null}

        {!isScheduled && (
        <>
        <div className={`px-4 py-2 flex items-center justify-between text-sm text-muted-foreground ${fillHeight ? 'mt-auto' : ''}`}>
          <div className="flex items-center gap-2">
            {totalReactionCount > 0 && (
              <button
                type="button"
                onClick={() => setIsReactionSummaryOpen(true)}
                aria-label={`${totalReactionCount} cảm xúc, xem chi tiết`}
                className="flex cursor-pointer items-center gap-2 hover:opacity-85"
              >
                <div className="flex items-center -space-x-1">
                  {activeReactions.slice(0, 3).map((reaction) => (
                    <span
                      key={reaction.type}
                      className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-card leading-none"
                    >
                      <img src={reaction.emoji} alt={reaction.label} width={15} height={15} draggable={false} />
                    </span>
                  ))}
                </div>
                <span>{totalReactionCount}</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>{commentCount} bình luận</span>
            <span>{shareCount} chia sẻ</span>
          </div>
        </div>

        <div className="h-px bg-muted mx-4" />

        <div className="px-4 py-2 grid grid-cols-3 gap-2 items-center">
          <ReactionButton
            initialReaction={selectedReaction}
            onReactionChange={handleReactionChange}
            className="w-full"
            buttonClassName="cursor-pointer disabled:cursor-not-allowed"
            disabled={isReacting}
          />

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-muted-foreground transition-colors hover:bg-muted"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Bình luận</span>
          </button>

          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-muted-foreground transition-colors hover:bg-muted"
          >
            <Share2 className="w-5 h-5" />
            <span className="font-medium">Chia sẻ</span>
          </button>
        </div>
        </>
        )}
      </div>

      <PostDetailModal
        post={postData}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCommentAdded={() => setCommentCount((prev) => prev + 1)}
        onCommentCountChange={setCommentCount}
        onShareAdded={(count) => setShareCount(count)}
        originalPostId={originalPostId}
        parentShareId={sharedPost ? id : undefined}
        selectedReaction={selectedReaction}
        onReactionChange={handleReactionChange}
        isReacting={isReacting}
        onPrivacyChange={(nextPrivacy, nextExcluded, nextAllowed) => {
          setCurrentPrivacy(nextPrivacy);
          setExcludedUserIds(nextExcluded);
          setAllowedUserIds(nextAllowed);
        }}
        onEdit={
          canEditPost
            ? () => {
                setIsModalOpen(false);
                setEditModalOpen(true);
              }
            : undefined
        }
        onDelete={() => {
          setIsModalOpen(false);
          openDeleteDialog();
        }}
        livePreview={
          liveSource ? (
            <LivePostPreviewCard
              postId={liveSource.postId}
              authorId={liveSource.authorId}
              content={liveSource.content}
              alwaysActive
              compact
            />
          ) : undefined
        }
      />

      <ReactionSummaryDialog
        open={isReactionSummaryOpen}
        onOpenChange={setIsReactionSummaryOpen}
        postId={id}
        reactionCounts={reactionCounts}
      />

      {/* Fullscreen Lightbox: ảnh vùng giữa; thanh zoom + đếm ảnh hàng dưới, không chồng ảnh */}
      {isLightboxOpen && imagesOnly.length > 0 && (
        <div
          className="fixed inset-0 z-[1000] flex h-dvh max-h-dvh flex-col bg-black/90 transition-opacity"
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="absolute right-4 top-4 z-[1001] cursor-pointer rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            onClick={closeLightbox}
            aria-label="Đóng xem ảnh"
          >
            <X size={32} />
          </button>

          {imagesOnly.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 top-1/2 z-[1001] -translate-y-1/2 cursor-pointer rounded-full bg-black/50 p-3 text-white transition-colors hover:bg-black/70"
                aria-label="Ảnh trước"
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
              >
                <ChevronLeft size={40} />
              </button>
              <button
                type="button"
                className="absolute right-4 top-1/2 z-[1001] -translate-y-1/2 cursor-pointer rounded-full bg-black/50 p-3 text-white transition-colors hover:bg-black/70"
                aria-label="Ảnh tiếp theo"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
              >
                <ChevronRight size={40} />
              </button>
            </>
          )}

          <div
            className="flex min-h-0 flex-1 flex-col pt-14"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden px-2"
              onWheel={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  setLightboxZoom((z) =>
                    Math.min(4, Math.max(0.25, z + (e.deltaY < 0 ? 0.12 : -0.12))),
                  );
                }
              }}
            >
              <ImageWithFallback
                src={imagesOnly[lightboxIndex]}
                alt={`Xem ảnh ${lightboxIndex + 1}`}
                className="max-h-full max-w-[calc(100dvw-16px)] object-contain shadow-2xl sm:max-w-[calc(100dvw-24px)]"
                style={{
                  transform: `rotate(${lightboxRotation}deg) scale(${lightboxZoom})`,
                  transformOrigin: 'center center',
                }}
                draggable={false}
              />
            </div>

            <div className="pointer-events-none flex shrink-0 flex-col items-center gap-2 px-4 pb-4 pt-3">
              <div className="pointer-events-auto flex w-full max-w-lg flex-row flex-wrap items-center justify-center gap-3 sm:max-w-none sm:flex-nowrap">
                <div className="flex items-center gap-1 rounded-full bg-black/60 p-1.5 text-white shadow-lg">
              <button
                type="button"
                className="cursor-pointer rounded-full p-2 hover:bg-card/15"
                aria-label="Thu nhỏ"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxZoom((z) => Math.max(0.25, z - 0.25));
                }}
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="min-w-[3.25rem] cursor-pointer rounded-full px-2 py-1.5 text-sm font-semibold tabular-nums hover:bg-card/15"
                title="Ctrl + cuộn chuột để zoom"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxZoom(1);
                  setLightboxRotation(0);
                }}
              >
                {Math.round(lightboxZoom * 100)}%
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-full p-2 hover:bg-card/15"
                aria-label="Phóng to"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxZoom((z) => Math.min(4, z + 0.25));
                }}
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-full p-2 hover:bg-card/15"
                aria-label="Xoay ảnh 90°"
                title="Xoay 90°"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxRotation((r) => (r + 90) % 360);
                }}
              >
                <RotateCw className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-full p-2 hover:bg-card/15"
                aria-label="Vừa khung"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxZoom(1);
                  setLightboxRotation(0);
                }}
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>
            {imagesOnly.length > 1 && (
                  <div className="shrink-0 rounded-full bg-black/50 px-4 py-1.5 text-sm font-medium tabular-nums text-white">
                    {lightboxIndex + 1} / {imagesOnly.length}
                  </div>
                )}
              </div>
              <p className="pointer-events-none text-center text-xs text-white/60">
                Ctrl + cuộn (hoặc ⌘ + cuộn) để zoom nhanh
              </p>
            </div>
          </div>
        </div>
      )}

      <PostShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        postId={originalPostId}
        parentShareId={sharedPost ? id : undefined}
        postContent={sharedPost && originalPost ? originalPost.content : displayContent}
        postImage={sharedPost && originalPost
          ? (originalPost.image || (originalPost.media?.type === 'image' ? originalPost.media.url : undefined))
          : (image || (media?.type === 'image' ? media.url : undefined))}
        postAuthorName={sharedPost && originalPost ? originalPost.author.name : author.name}
        isLivePost={hasLivePreview}
        onShareComplete={(response) => {
          if (sharedPost && response.wrapperShareCount != null) {
            setShareCount(response.wrapperShareCount);
          } else {
            setShareCount(response.shareCount);
          }
          // Refresh the feed so the new share post shows up immediately (no F5 needed)
          void queryClient.invalidateQueries({ queryKey: POSTS_FEED_KEY });
        }}
      />

      <EditPostModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        postId={id}
        initialContent={displayContent}
        initialMedia={galleryItems.map((g) => ({ type: g.type, url: g.url }))}
        initialPrivacy={currentPrivacy}
        initialExcludedUserIds={excludedUserIds}
        initialAllowedUserIds={allowedUserIds}
        initialStatus={postStatus}
        initialScheduledAt={initialScheduledAt}
        isGroupPost={!!group}
        isShareWrapper={sharedPost}
        onPostUpdated={(updated) => {
          setDisplayContent(updated.content);
          setDisplayMediaList(updated.mediaList);
          if (updated.privacy !== undefined) setCurrentPrivacy(updated.privacy);
          if (updated.excludedUserIds !== undefined) setExcludedUserIds(updated.excludedUserIds);
          if (updated.allowedUserIds !== undefined) setAllowedUserIds(updated.allowedUserIds);
          if (updated.status !== undefined) setPostStatus(updated.status);
          if (updated.status === 'SCHEDULED' && updated.scheduledAt) {
            setDisplayTimestamp(formatScheduledPostLabel(updated.scheduledAt));
          } else if (updated.publishedAt || updated.createdAt) {
            setDisplayTimestamp(formatPostTimestamp(updated.publishedAt || updated.createdAt));
          }
          if (updated.fullPost) {
            onPostUpdated?.(updated.fullPost);
          }
        }}
      />

      <AlertDialog modal={false} open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent
          className="border border-border bg-card sm:max-w-md"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              {sharedPost ? 'Xóa bài chia sẻ' : 'Xóa bài viết'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {sharedPost
                ? 'Bạn có chắc muốn gỡ bài chia sẻ này khỏi bảng tin? Bài viết gốc sẽ không bị xóa.'
                : 'Bạn có chắc muốn xóa bài viết không?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer border-border">Không</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 disabled:cursor-not-allowed dark:bg-red-600 dark:hover:bg-red-700"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                void performDelete();
              }}
            >
              {isDeleting ? 'Đang xóa...' : 'Có'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


