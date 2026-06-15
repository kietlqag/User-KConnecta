import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import {
  Bell,
  MessageCircle,
  Share2,
  Globe,
  Users,
  Lock,
  Radio,
  Play,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { Room, RoomEvent, Track, type RemoteTrack } from 'livekit-client';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { postService, SAVED_POSTS_CHANGED_EVENT, type PostReactionCountResponse, type ReactionType } from '@/services/postService';
import { liveService, type LiveEventSubscriberResponse, type LiveSessionResponse } from '@/services/liveService';
import { isSessionHost, navigateToLiveSession, startScheduledLiveAndNavigate } from '@/features/live/utils/navigateToLiveSession';
import { formatScheduledDisplayFromIso, isScheduledSessionDue } from '@/features/live/utils/liveFormUtils';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { PostDetailModal } from '../posts/PostDetailModal';
import { PostShareModal } from '../posts/PostShareModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
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

const isPlayableUrl = (value?: string | null) => /^https?:\/\//i.test(value?.trim() ?? '');
const LIVE_PREVIEW_ACTIVE_EVENT = 'kconnecta.livePreviewActive';

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
}: PostProps) {
  const navigate = useNavigate();
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
  const [currentPrivacy, setCurrentPrivacy] = useState<Privacy>(initialPrivacy);
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    setCurrentPrivacy(initialPrivacy);
  }, [initialPrivacy, id]);
  const isOwner = !!currentUser && currentUser.id === author.id;
  const livePreviewRootRef = useRef<HTMLButtonElement | null>(null);
  const livePreviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const livePreviewRoomRef = useRef<Room | null>(null);
  const livePreviewConnectingRef = useRef(false);
  const [liveSessionStatus, setLiveSessionStatus] = useState<'LIVE' | 'ENDED' | 'CANCELED' | 'SCHEDULED' | null>(null);
  const [liveSession, setLiveSession] = useState<LiveSessionResponse | null>(null);
  const [isLiveSubscribed, setIsLiveSubscribed] = useState(false);
  const [liveSubscriptionCount, setLiveSubscriptionCount] = useState(0);
  const [isSubscribeLoading, setIsSubscribeLoading] = useState(false);
  const [isSubscribersOpen, setIsSubscribersOpen] = useState(false);
  const [isSubscribersLoading, setIsSubscribersLoading] = useState(false);
  const [eventSubscribers, setEventSubscribers] = useState<LiveEventSubscriberResponse[]>([]);
  const [isLivePreviewReady, setIsLivePreviewReady] = useState(false);
  const [isLivePreviewConnecting, setIsLivePreviewConnecting] = useState(false);
  const isLiveEnded = liveSessionStatus === 'ENDED' || liveSessionStatus === 'CANCELED';
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
      mediaList.length > 0
        ? mediaList
        : media?.url
          ? [{ type: media.type === 'video' ? 'VIDEO' : 'IMAGE', url: media.url }]
          : image
            ? [{ type: 'IMAGE', url: image }]
            : [];
    return raw.filter((x) => Boolean(x.url?.trim()));
  }, [mediaList, media, image]);

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

  useEffect(() => {
    if (!isLivePost) return;
    let cancelled = false;
    const loadLiveStatus = async () => {
      try {
        const session = await liveService.getSessionByPost(id);
        if (!cancelled) {
          setLiveSession(session);
          setLiveSessionStatus(session.status);
          setIsLiveSubscribed(Boolean(session.subscribedByCurrentUser));
          setLiveSubscriptionCount(session.subscriptionCount ?? 0);
        }
      } catch {
        if (!cancelled) {
          setLiveSession(null);
          setLiveSessionStatus(null);
        }
      }
    };
    void loadLiveStatus();
    const interval = window.setInterval(() => void loadLiveStatus(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [id, isLivePost]);

  useEffect(() => {
    if (!isLivePost || liveSessionStatus !== 'LIVE' || !currentUser?.id) return;
    const root = livePreviewRootRef.current;
    if (!root) return;

    let cancelled = false;
    let room: Room | null = null;

    const disconnectPreview = () => {
      room?.disconnect();
      room = null;
      livePreviewRoomRef.current = null;
      livePreviewConnectingRef.current = false;
      setIsLivePreviewReady(false);
      setIsLivePreviewConnecting(false);
      if (livePreviewVideoRef.current) {
        livePreviewVideoRef.current.srcObject = null;
      }
    };

    const attachTrack = (track: RemoteTrack) => {
      if (track.kind !== Track.Kind.Video || !livePreviewVideoRef.current) return;
      track.attach(livePreviewVideoRef.current);
      setIsLivePreviewReady(true);
      setIsLivePreviewConnecting(false);
    };

    const attachExistingTracks = (activeRoom: Room) => {
      activeRoom.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => {
          if (publication.track) {
            attachTrack(publication.track as RemoteTrack);
          }
        });
      });
    };

    const connectPreview = async () => {
      if (room || cancelled || livePreviewConnectingRef.current) return;
      livePreviewConnectingRef.current = true;
      setIsLivePreviewConnecting(true);
      try {
        const session = liveSession?.status === 'LIVE' ? liveSession : await liveService.getSessionByPost(id);
        if (cancelled || session.status !== 'LIVE') {
          livePreviewConnectingRef.current = false;
          setIsLivePreviewConnecting(false);
          return;
        }
        const token = await liveService.getToken({ sessionId: session.id, userId: currentUser.id, role: 'VIEWER' });
        if (cancelled) return;
        const nextRoom = new Room();
        room = nextRoom;
        livePreviewRoomRef.current = nextRoom;
        window.dispatchEvent(new CustomEvent(LIVE_PREVIEW_ACTIVE_EVENT, { detail: { postId: id, sessionId: session.id } }));
        nextRoom.on(RoomEvent.TrackSubscribed, attachTrack);
        await nextRoom.connect(token.livekitUrl, token.token);
        if (cancelled) return;
        attachExistingTracks(nextRoom);
      } catch {
        disconnectPreview();
      }
    };

    const handleOtherPreview = (event: Event) => {
      const detail = (event as CustomEvent<{ postId?: string }>).detail;
      if (detail?.postId && detail.postId !== id) {
        disconnectPreview();
      }
    };
    window.addEventListener(LIVE_PREVIEW_ACTIVE_EVENT, handleOtherPreview);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void connectPreview();
        } else {
          disconnectPreview();
        }
      },
      { threshold: 0.15, rootMargin: '120px 0px' },
    );

    observer.observe(root);
    return () => {
      cancelled = true;
      window.removeEventListener(LIVE_PREVIEW_ACTIVE_EVENT, handleOtherPreview);
      observer.disconnect();
      disconnectPreview();
    };
  }, [currentUser?.id, id, isLivePost, liveSession, liveSessionStatus]);

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
  const [liveTitle, liveDescription] = useMemo(() => {
    const [title, ...rest] = content.split(/\n\s*\n/);
    return [title?.trim() || 'Video trực tiếp', rest.join('\n\n').trim()];
  }, [content]);
  const liveReplayUrl = isLiveEnded && isPlayableUrl(liveSession?.playbackUrl) ? liveSession?.playbackUrl?.trim() : '';
  const isRecordingProcessing = isLiveEnded && liveSession?.recordingStatus === 'PROCESSING' && !liveReplayUrl;
  const isRecordingFailed = isLiveEnded && liveSession?.recordingStatus === 'FAILED' && !liveReplayUrl;
  const scheduledLiveAt = liveSessionStatus === 'SCHEDULED' && liveSession?.scheduledAt
    ? formatScheduledDisplayFromIso(liveSession.scheduledAt)
    : '';
  const canStartScheduledLive = isScheduledSessionDue(liveSession?.scheduledAt);
  const isScheduledLockedForHost = Boolean(scheduledLiveAt && isOwner && !canStartScheduledLive);

  const postData = useMemo(
    () => ({
      id,
      author: {
        name: author.name,
        avatar: author.avatar,
      },
      content,
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
      content,
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
        await postService.unsavePost(currentUser.id, id);
        setIsSaved(false);
        toast.success('Đã bỏ lưu bài viết.');
      } else {
        await postService.savePost(currentUser.id, id);
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

  const handleToggleLiveSubscription = async () => {
    if (!liveSession?.id) return;
    const user = authService.getCurrentUser();
    if (!user) {
      toast.error('Bạn cần đăng nhập để đặt nhắc nhở');
      return;
    }
    setIsSubscribeLoading(true);
    try {
      const result = isLiveSubscribed
        ? await liveService.unsubscribeFromEvent(liveSession.id)
        : await liveService.subscribeToEvent(liveSession.id);
      setIsLiveSubscribed(result.subscribed);
      setLiveSubscriptionCount(result.subscriptionCount);
      toast.success(result.subscribed ? 'Đã đặt nhắc nhở cho buổi live' : 'Đã bỏ quan tâm');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật nhắc nhở');
    } finally {
      setIsSubscribeLoading(false);
    }
  };

  const handleOpenSubscribers = async () => {
    if (!liveSession?.id) return;
    setIsSubscribersOpen(true);
    setIsSubscribersLoading(true);
    try {
      const result = await liveService.getEventSubscribers(liveSession.id);
      setEventSubscribers(result.subscribers);
      setLiveSubscriptionCount(result.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải danh sách người quan tâm');
      setIsSubscribersOpen(false);
    } finally {
      setIsSubscribersLoading(false);
    }
  };

  const handleOpenLive = async () => {
    try {
      const session = await liveService.getSessionByPost(id);
      setLiveSession(session);
      setLiveSessionStatus(session.status);
      setIsLiveSubscribed(Boolean(session.subscribedByCurrentUser));
      setLiveSubscriptionCount(session.subscriptionCount ?? 0);
      if (session.status === 'SCHEDULED') {
        if (isOwner && isSessionHost(session, currentUser?.id) && isScheduledSessionDue(session.scheduledAt)) {
          await startScheduledLiveAndNavigate(session, navigate);
        }
        return;
      }
      if (session.status === 'ENDED' || session.status === 'CANCELED') {
        if (isPlayableUrl(session.playbackUrl)) {
          navigate(`/live/viewer?sessionId=${encodeURIComponent(session.id)}`);
          return;
        }
        if (session.recordingStatus === 'PROCESSING') {
          toast.info('Bản ghi live đang được xử lý.');
          return;
        }
        if (session.recordingStatus === 'FAILED') {
          toast.error('Không thể tạo bản ghi phát lại cho phiên live này.');
          return;
        }
        toast.info('Live đã kết thúc.');
        return;
      }
      await navigateToLiveSession(session, currentUser?.id, navigate);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể mở phiên live');
    }
  };

  const showLiveVideo = Boolean(
    (liveSessionStatus === 'LIVE' && (isLivePreviewReady || isLivePreviewConnecting))
    || liveReplayUrl,
  );
  const showLivePlaceholder = liveSessionStatus === 'LIVE' && !isLivePreviewReady && !isLivePreviewConnecting;

  return (
    <>
      <div id={`post-${id}`} className="bg-white rounded-lg shadow mb-4">
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
                <div className="flex items-center gap-1 text-[13px] text-gray-500 leading-tight">
                  {group ? (
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
                  <span>·</span>
                  {currentPrivacy === 'PRIVATE' ? (
                    <Lock className="w-3 h-3" />
                  ) : currentPrivacy === 'PUBLIC' ? (
                    <Globe className="w-3 h-3" />
                  ) : (
                    <Users className="w-3 h-3" />
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
              onDelete={() => setDeleteDialogOpen(true)}
              onPrivacyChange={setCurrentPrivacy}
            />
          </div>

          {!isLivePost && <p className="text-gray-900 mb-3 whitespace-pre-wrap">{content}</p>}
        </div>

        {isLivePost ? (
          <div className="px-4 pb-4">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-zinc-950 shadow-sm">
              <button
                ref={livePreviewRootRef}
                type="button"
                disabled={isScheduledLockedForHost}
                onClick={isScheduledLockedForHost ? undefined : () => void handleOpenLive()}
                className={`group relative block aspect-video w-full overflow-hidden bg-black text-left ${
                  isScheduledLockedForHost ? 'cursor-default' : ''
                }`}
              >
                {(liveSessionStatus === 'LIVE' || liveReplayUrl) && (
                  <video
                    ref={liveSessionStatus === 'LIVE' ? livePreviewVideoRef : undefined}
                    src={liveReplayUrl || undefined}
                    muted
                    autoPlay
                    playsInline
                    loop={Boolean(liveReplayUrl)}
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                      isLivePreviewReady || liveReplayUrl ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                )}
                {showLivePlaceholder && (
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-slate-800" />
                )}
                <div
                  className={`absolute inset-0 transition-opacity duration-300 ${
                    showLiveVideo ? 'opacity-0 group-hover:opacity-100' : 'opacity-40'
                  } [background:radial-gradient(circle_at_25%_25%,rgba(239,68,68,.45),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(37,99,235,.38),transparent_30%),linear-gradient(135deg,rgba(15,23,42,.2),rgba(0,0,0,.9))]`}
                />
                <div className={`absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white shadow ${isLiveEnded ? 'bg-gray-700' : 'bg-red-600'}`}>
                  <span className={`h-2 w-2 rounded-full bg-white ${isLiveEnded ? '' : 'animate-pulse'}`} />
                  {scheduledLiveAt ? 'Đã lên lịch' : liveReplayUrl ? 'Phát lại' : isRecordingProcessing ? 'Đang xử lý' : isRecordingFailed ? 'Lỗi bản ghi' : isLiveEnded ? 'Đã kết thúc' : 'Live'}
                </div>
                {isLivePreviewConnecting && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/35">
                    <span className="rounded-full bg-black/55 px-4 py-2 text-sm font-medium text-white">
                      Đang kết nối live...
                    </span>
                  </div>
                )}
                {!showLiveVideo && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur ${
                      isScheduledLockedForHost ? '' : 'transition-transform group-hover:scale-105'
                    }`}>
                      {isScheduledLockedForHost ? (
                        <Lock className="h-7 w-7" />
                      ) : (
                        <Play className="ml-1 h-8 w-8 fill-white" />
                      )}
                    </span>
                  </div>
                )}
                <div className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/80 to-transparent p-4 text-white transition-opacity duration-300 ${
                  showLiveVideo ? 'opacity-100 group-hover:opacity-100' : 'opacity-100'
                }`}>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-100">
                    <Radio className="h-4 w-4" />
                    {scheduledLiveAt
                      ? `Bắt đầu lúc ${scheduledLiveAt}`
                      : liveReplayUrl
                        ? 'Xem lại phiên live'
                        : isRecordingProcessing
                          ? 'Bản ghi đang được xử lý'
                          : isRecordingFailed
                            ? 'Không thể tạo bản ghi phát lại'
                            : isLiveEnded
                              ? 'Live đã kết thúc'
                              : isLivePreviewReady
                                ? 'Đang phát trực tiếp'
                                : isLivePreviewConnecting
                                  ? 'Đang tải video live...'
                                  : 'Đang phát trực tiếp'}
                  </div>
                  <h2 className="line-clamp-2 text-xl font-bold leading-tight">{liveTitle}</h2>
                  {liveDescription && <p className="mt-1 line-clamp-2 text-sm text-white/75">{liveDescription}</p>}
                </div>
              </button>
              <div className="flex items-center justify-between gap-3 bg-white px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{liveTitle}</p>
                  <p className="text-xs text-gray-500">
                    {scheduledLiveAt
                      ? isOwner && !canStartScheduledLive
                        ? `Có thể bắt đầu phát lúc ${scheduledLiveAt}`
                        : scheduledLiveAt
                      : liveReplayUrl
                        ? 'Nhấn để xem lại phiên live đã phát'
                        : isRecordingProcessing
                          ? 'Vui lòng quay lại sau ít phút'
                          : isLivePreviewReady
                            ? 'Video live đang phát ngay trên bảng tin'
                            : 'Nhấn để xem phiên live và tham gia bình luận'}
                  </p>
                  {scheduledLiveAt && isOwner && liveSubscriptionCount > 0 && (
                    <button
                      type="button"
                      onClick={() => void handleOpenSubscribers()}
                      className="mt-1 text-xs font-semibold text-green-700 hover:underline"
                    >
                      {liveSubscriptionCount} người quan tâm
                    </button>
                  )}
                  {scheduledLiveAt && isOwner && liveSubscriptionCount === 0 && (
                    <p className="mt-1 text-xs text-gray-400">Chưa có người quan tâm</p>
                  )}
                </div>
                {scheduledLiveAt && isOwner ? (
                  <button
                    type="button"
                    disabled={!canStartScheduledLive}
                    onClick={() => void handleOpenLive()}
                    className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                      canStartScheduledLive
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'cursor-not-allowed bg-gray-400'
                    }`}
                  >
                    {canStartScheduledLive ? 'Bắt đầu phát' : 'Chưa đến giờ'}
                  </button>
                ) : scheduledLiveAt ? (
                  <button
                    type="button"
                    disabled={isSubscribeLoading}
                    onClick={() => void handleToggleLiveSubscription()}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold ${
                      isLiveSubscribed
                        ? 'border border-green-600 bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <Bell className="h-4 w-4" />
                    {isSubscribeLoading ? 'Đang lưu...' : isLiveSubscribed ? 'Đã quan tâm' : 'Quan tâm'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleOpenLive()}
                    className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                      isLiveEnded
                        ? 'bg-gray-700 hover:bg-gray-800'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {liveReplayUrl
                      ? 'Xem lại'
                      : isRecordingProcessing
                        ? 'Đang xử lý'
                        : isLiveEnded
                          ? 'Đã kết thúc'
                          : 'Xem trực tiếp'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : galleryItems.length >= 2 ? (
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
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-white bg-white text-sm leading-none"
                    >
                      {reaction.emoji}
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
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-gray-600 transition-colors hover:bg-gray-100"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Bình luận</span>
          </button>

          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-gray-600 transition-colors hover:bg-gray-100"
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
        selectedReaction={selectedReaction}
        onReactionChange={handleReactionChange}
        isReacting={isReacting}
        onPrivacyChange={setCurrentPrivacy}
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
        postId={id}
        postContent={content}
        postImage={image || (media?.type === 'image' ? media.url : undefined)}
        onShareComplete={(count) => setShareCount(count)}
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

      <Dialog open={isSubscribersOpen} onOpenChange={setIsSubscribersOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Người quan tâm sự kiện</DialogTitle>
          </DialogHeader>
          {isSubscribersLoading ? (
            <p className="py-6 text-center text-sm text-gray-500">Đang tải...</p>
          ) : eventSubscribers.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Chưa có ai đăng ký nhắc nhở.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {eventSubscribers.map((subscriber) => (
                <button
                  key={subscriber.userId}
                  type="button"
                  onClick={() => {
                    setIsSubscribersOpen(false);
                    navigate(`/profile/${subscriber.userId}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-gray-100"
                >
                  <ImageWithFallback
                    src={subscriber.avatarUrl || ''}
                    alt={subscriber.fullName || subscriber.username}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {subscriber.fullName || subscriber.username}
                    </p>
                    <p className="text-xs text-gray-500">@{subscriber.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


