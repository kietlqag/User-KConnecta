import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  MessageCircle,
  Share2,
  Globe,
  Users,
  Lock,
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
import { postService, SAVED_POSTS_CHANGED_EVENT, type PostReactionCountResponse, type ReactionType } from '@/services/postService';
import { ImageWithFallback } from '../figma/ImageWithFallback';
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
import { POSTS_FEED_KEY } from '@/features/home/hooks/usePosts';
import { PostMoreMenu, type Privacy } from './PostMoreMenu';
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
  group?: Group;
  commentsData?: Comment[];
  mediaList?: { type: 'IMAGE' | 'VIDEO'; url: string }[];
  isLivePost?: boolean;
  privacy?: Privacy;
  onDelete?: (postId: string) => void;
  onReactionChange?: (postId: string, reactionType: ReactionType | null) => void;
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
  onDelete,
  onReactionChange,
  sharedPost = false,
  originalPost,
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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [displayContent, setDisplayContent] = useState(content);
  const [displayMediaList, setDisplayMediaList] = useState(mediaList);
  const [currentPrivacy, setCurrentPrivacy] = useState<Privacy>(initialPrivacy);
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    setDisplayContent(content);
    setDisplayMediaList(mediaList);
  }, [content, mediaList, id]);

  useEffect(() => {
    setCurrentPrivacy(initialPrivacy);
  }, [initialPrivacy, id]);
  // Share wrappers don't support edit/delete via the post menu
  const isOwner = !sharedPost && !!currentUser && currentUser.id === author.id;
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
  const mediaType = firstItem?.type === 'VIDEO' ? 'video' : 'image';
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
      isOwner,
      currentUserId: currentUser?.id,
    }),
    [
      author.avatar,
      author.name,
      commentCount,
      displayContent,
      currentPrivacy,
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
      toast.success('Đã xóa bài viết');
      onDelete?.(id);
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa bài viết');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div id={`post-${id}`} className="bg-surface rounded-2xl shadow-[0_1px_3px_rgba(17,17,38,0.06)] dark:shadow-none border border-border mb-4">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 group">
              <div className="relative">
                <ImageWithFallback
                  src={group?.icon || author.avatar}
                  alt={group?.name || author.name}
                  className={`w-10 h-10 object-cover cursor-pointer ${group ? 'rounded-lg shadow-sm' : 'rounded-full'}`}
                  onClick={() => group ? navigate(`/groups/${group.id}`) : navigate(`/profile/${author.id}`)}
                />
                {group && (
                  <ImageWithFallback
                    src={author.avatar}
                    alt={author.name}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white object-cover cursor-pointer shadow-sm"
                    onClick={() => navigate(`/profile/${author.id}`)}
                  />
                )}
              </div>
              <div className="flex flex-col">
                <h3
                  className="font-bold text-[15px] text-gray-900 cursor-pointer hover:underline leading-tight"
                  onClick={() => group ? navigate(`/groups/${group.id}`) : navigate(`/profile/${author.id}`)}
                >
                  {group?.name || author.name}
                </h3>
                <div className="flex items-center gap-1 text-[13px] text-gray-500 leading-tight flex-wrap">
                  {sharedPost && originalPost ? (
                    <>
                      <span>đã chia sẻ bài viết của</span>
                      <span
                        className="font-semibold text-gray-700 hover:underline cursor-pointer"
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
                  <span>{timestamp}</span>
                  {!sharedPost && (
                    <>
                      <span>·</span>
                      {currentPrivacy === 'PRIVATE' ? (
                        <Lock className="w-3 h-3" />
                      ) : currentPrivacy === 'PUBLIC' ? (
                        <Globe className="w-3 h-3" />
                      ) : (
                        <Users className="w-3 h-3" />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            <PostMoreMenu
              postId={id}
              isSaved={isSaved}
              isOwner={isOwner}
              privacy={currentPrivacy}
              currentUserId={currentUser?.id}
              onToggleSave={handleToggleSave}
              onEdit={isOwner && !hasLivePreview ? () => setEditModalOpen(true) : undefined}
              onDelete={() => setDeleteDialogOpen(true)}
              onPrivacyChange={setCurrentPrivacy}
            />
          </div>

          {(displayContent && !hasLivePreview) || (sharedPost && displayContent) ? (
            <p className="text-gray-900 mb-3 whitespace-pre-wrap">{displayContent}</p>
          ) : null}

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
                    <img
                      src={originalPost.author.avatar}
                      alt={originalPost.author.name}
                      className="w-8 h-8 rounded-full object-cover"
                      onClick={(e) => { e.stopPropagation(); navigate(`/profile/${originalPost.author.id}`); }}
                    />
                    <div className="flex flex-col">
                      <span
                        className="text-sm font-semibold text-gray-900 hover:underline cursor-pointer leading-tight"
                        onClick={(e) => { e.stopPropagation(); navigate(`/profile/${originalPost.author.id}`); }}
                      >
                        {originalPost.author.name}
                      </span>
                      <span className="text-xs text-gray-500 leading-tight">{originalPost.timestamp}</span>
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
                      <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-4">{originalPost.content}</p>
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
          <div className="relative cursor-pointer bg-black" onClick={() => openLightbox(0)}>
            {mediaType === 'image' ? (
              <ImageWithFallback
                src={mediaUrl}
                alt="Post content"
                className="max-h-[600px] w-full object-contain"
              />
            ) : (
              <video
                src={mediaUrl}
                controls
                className="max-h-[600px] w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        ) : null}

        <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            {totalReactionCount > 0 && (
              <button
                type="button"
                onClick={() => setIsReactionSummaryOpen(true)}
                className="flex cursor-pointer items-center gap-2 hover:opacity-85"
              >
                <div className="flex items-center -space-x-1">
                  {activeReactions.slice(0, 3).map((reaction) => (
                    <span
                      key={reaction.type}
                      className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-white leading-none"
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

        <div className="h-px bg-gray-300 mx-4" />

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
        onPrivacyChange={setCurrentPrivacy}
        onEdit={
          isOwner && !hasLivePreview
            ? () => {
                setIsModalOpen(false);
                setEditModalOpen(true);
              }
            : undefined
        }
        onDelete={() => {
          setIsModalOpen(false);
          setDeleteDialogOpen(true);
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
          >
            <X size={32} />
          </button>

          {imagesOnly.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 top-1/2 z-[1001] -translate-y-1/2 cursor-pointer rounded-full bg-black/50 p-3 text-white transition-colors hover:bg-black/70"
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
                className="cursor-pointer rounded-full p-2 hover:bg-white/15"
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
                className="min-w-[3.25rem] cursor-pointer rounded-full px-2 py-1.5 text-sm font-semibold tabular-nums hover:bg-white/15"
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
                className="cursor-pointer rounded-full p-2 hover:bg-white/15"
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
                className="cursor-pointer rounded-full p-2 hover:bg-white/15"
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
                className="cursor-pointer rounded-full p-2 hover:bg-white/15"
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
        onPostUpdated={({ content: newContent, mediaList: newMediaList }) => {
          setDisplayContent(newContent);
          setDisplayMediaList(newMediaList);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border border-gray-200 bg-white sm:max-w-md dark:border-gray-600 dark:bg-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white">Xóa bài viết</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
              Bạn có chắc muốn xóa bài viết không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer border-gray-300 dark:border-gray-600">Không</AlertDialogCancel>
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


