import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, MessageCircle, Share2, Globe, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { postService, type PostReactionCountResponse, type ReactionType } from '@/services/postService';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { PostDetailModal } from '../posts/PostDetailModal';
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
  currentUserReactionType?: ReactionType | null;
  reactionCounts?: PostReactionCountResponse[];
  group?: Group;
  commentsData?: Comment[];
  mediaList?: { type: 'IMAGE' | 'VIDEO'; url: string }[];
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
  currentUserReactionType = null,
  reactionCounts: serverReactionCounts,
  group,
  mediaList = [],
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
  const [isSharing, setIsSharing] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [reactionCounts, setReactionCounts] = useState<ReactionCountMap>(() =>
    mapReactionCounts(
      serverReactionCounts,
      buildInitialReactionCounts(likes, currentUserReactionType),
    ),
  );

  // Lightbox State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Filter images for lightbox
  const imagesOnly = useMemo(() => {
    if (mediaList.length > 0) {
      return mediaList.filter(m => m.type === 'IMAGE').map(m => m.url);
    }
    const singleImg = media?.url || image;
    return singleImg ? [singleImg] : [];
  }, [mediaList, media, image]);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
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

  const mediaUrl = media?.url || image;
  const mediaType = media?.type || 'image';
  const activeReactions = getActiveReactions(reactionCounts);
  const totalReactionCount = getTotalReactionCount(reactionCounts);

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
      reactionCounts,
    }),
    [author.avatar, author.name, commentCount, content, id, likeCount, mediaUrl, mediaType, reactionCounts, shareCount, timestamp],
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
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể thả cảm xúc');
    } finally {
      setIsReacting(false);
    }
  };

  const handleShare = async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để chia sẻ');
      return;
    }

    try {
      setIsSharing(true);
      await postService.sharePost(id, { userId: currentUser.id });
      setShareCount((prev) => prev + 1);
      toast.success('Đã chia sẻ bài viết');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể chia sẻ bài viết');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow mb-4">
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
                  <Globe className="w-3 h-3" />
                </div>
              </div>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <p className="text-gray-900 mb-3 whitespace-pre-wrap">{content}</p>
        </div>

        {mediaUrl && (
          <div className="relative bg-black cursor-pointer" onClick={() => openLightbox(0)}>
            {mediaType === 'image' ? (
              <ImageWithFallback
                src={mediaUrl}
                alt="Post content"
                className="w-full max-h-[600px] object-contain"
              />
            ) : (
              <video 
                src={mediaUrl} 
                controls 
                className="w-full max-h-[600px] object-contain" 
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        )}

        <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            {totalReactionCount > 0 && (
              <button
                type="button"
                onClick={() => setIsReactionSummaryOpen(true)}
                className="flex items-center gap-2 hover:opacity-85"
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
            disabled={isReacting}
          />

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex w-full items-center justify-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 cursor-pointer"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Bình luận</span>
          </button>

          <button
            onClick={handleShare}
            disabled={isSharing}
            className="flex w-full items-center justify-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 cursor-pointer disabled:opacity-60"
          >
            <Share2 className="w-5 h-5" />
            <span className="font-medium">{isSharing ? 'Đang chia sẻ...' : 'Chia sẻ'}</span>
          </button>
        </div>
      </div>

      <PostDetailModal
        post={postData}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCommentAdded={() => setCommentCount((prev) => prev + 1)}
        onCommentCountChange={setCommentCount}
        onShareAdded={() => setShareCount((prev) => prev + 1)}
      />

      <ReactionSummaryDialog
        open={isReactionSummaryOpen}
        onOpenChange={setIsReactionSummaryOpen}
        postId={id}
        reactionCounts={reactionCounts}
      />

      {/* Fullscreen Lightbox */}
      {isLightboxOpen && imagesOnly.length > 0 && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 transition-opacity"
          onClick={closeLightbox}
        >
          <button 
            className="absolute right-4 top-4 z-[1001] rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            onClick={closeLightbox}
          >
            <X size={32} />
          </button>

          {imagesOnly.length > 1 && (
            <>
              <button 
                className="absolute left-4 z-[1001] rounded-full bg-black/50 p-3 text-white hover:bg-black/70 transition-colors"
                onClick={prevImage}
              >
                <ChevronLeft size={40} />
              </button>
              <button 
                className="absolute right-4 z-[1001] rounded-full bg-black/50 p-3 text-white hover:bg-black/70 transition-colors"
                onClick={nextImage}
              >
                <ChevronRight size={40} />
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1001] rounded-full bg-black/50 px-4 py-2 text-white text-lg font-medium">
                {lightboxIndex + 1} / {imagesOnly.length}
              </div>
            </>
          )}

          <div 
            className="max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <ImageWithFallback
              src={imagesOnly[lightboxIndex]}
              alt={`Fullscreen view ${lightboxIndex + 1}`}
              className="h-full w-full object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}


