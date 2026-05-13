import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, MessageCircle, Share2, Newspaper, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { postService, type PostReactionCountResponse, type ReactionType } from '@/services/postService';
import { storyService } from '@/services/storyService';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';
import { PostDetailModal } from '../../../../components/posts/PostDetailModal';
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
} from '../../../../components/reactions';
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

interface PostProps {
  id: string;
  userName: string;
  authorId: string;
  userAvatar: string;
  timestamp: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked?: boolean;
  currentUserReactionType?: ReactionType | null;
  reactionCounts?: PostReactionCountResponse[];
  onDelete?: (postId: string) => void;
}

export function Post({
  id,
  userName,
  authorId,
  userAvatar,
  timestamp,
  content,
  image,
  likes,
  comments,
  shares,
  isLiked: initialIsLiked = false,
  currentUserReactionType = null,
  reactionCounts: serverReactionCounts,
  onDelete,
}: PostProps) {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(initialIsLiked || !!currentUserReactionType);
  const [likeCount, setLikeCount] = useState(likes);
  const [commentCount, setCommentCount] = useState(comments);
  const [shareCount, setShareCount] = useState(shares);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReactionSummaryOpen, setIsReactionSummaryOpen] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<ReactionOption | null>(
    currentUserReactionType
      ? reactions.find((item) => item.type === currentUserReactionType) ?? null
      : null,
  );
  const [isSharing, setIsSharing] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isShareToStoryModalOpen, setIsShareToStoryModalOpen] = useState(false);
  const [isSharingToStory, setIsSharingToStory] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [isReacting, setIsReacting] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const currentUser = authService.getCurrentUser();
  const isOwner = !!currentUser && currentUser.id === authorId;
  const [reactionCounts, setReactionCounts] = useState<ReactionCountMap>(() =>
    mapReactionCounts(
      serverReactionCounts,
      buildInitialReactionCounts(likes, currentUserReactionType),
    ),
  );
  const activeReactions = getActiveReactions(reactionCounts);
  const totalReactionCount = getTotalReactionCount(reactionCounts);

  const postData = useMemo(
    () => ({
      id,
      author: {
        name: userName,
        avatar: userAvatar,
      },
      content,
      timestamp,
      likes: likeCount,
      comments: commentCount,
      shares: shareCount,
      image,
      reactionCounts,
    }),
    [commentCount, content, id, image, likeCount, reactionCounts, shareCount, timestamp, userAvatar, userName],
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
      setIsShareMenuOpen(false);
      await postService.sharePost(id, { userId: currentUser.id });
      setShareCount((prev) => prev + 1);
      toast.success('Đã chia sẻ bài viết');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể chia sẻ bài viết');
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareToStory = async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để chia sẻ lên tin');
      return;
    }

    if (!image && !content) {
      toast.error('Bài viết không có nội dung để chia sẻ lên tin');
      return;
    }

    try {
      setIsSharingToStory(true);
      await storyService.createStory({
        userId: currentUser.id,
        sharedImageUrl: image || undefined,
        textContent: image ? undefined : content,
        backgroundColor: image ? undefined : '#1877f2',
        textColor: image ? undefined : '#ffffff',
      });
      setIsShareToStoryModalOpen(false);
      toast.success('Đã chia sẻ lên tin thành công');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể chia sẻ lên tin');
    } finally {
      setIsSharingToStory(false);
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
      <div className="bg-white rounded-lg shadow mb-4">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 group">
              <ImageWithFallback
                src={userAvatar}
                alt={userName}
                className="w-10 h-10 rounded-full object-cover cursor-pointer"
                onClick={() => navigate(`/profile/${authorId}`)}
              />
              <div 
                className="cursor-pointer"
                onClick={() => navigate(`/profile/${authorId}`)}
              >
                <h3 className="font-semibold text-gray-900 group-hover:underline">{userName}</h3>
                <p className="text-sm text-gray-500">{timestamp}</p>
              </div>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                className="cursor-pointer rounded-full p-2 transition-colors hover:bg-gray-100"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-500" />
              </button>
              {isMoreMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsMoreMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={isDeleting}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4 shrink-0" />
                        <span>{isDeleting ? 'Đang xóa...' : 'Xóa bài viết'}</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="text-gray-900 mb-3">{content}</p>
        </div>

        {image && (
          <div className="relative bg-black">
            <ImageWithFallback
              src={image}
              alt="Post content"
              className="w-full max-h-[600px] object-contain"
            />
          </div>
        )}

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

          <div className="relative" ref={shareMenuRef}>
            <button
              type="button"
              onClick={() => setIsShareMenuOpen((prev) => !prev)}
              disabled={isSharing}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Share2 className="w-5 h-5" />
              <span className="font-medium">{isSharing ? 'Đang chia sẻ...' : 'Chia sẻ'}</span>
            </button>

            {isShareMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsShareMenuOpen(false)} />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 bg-white rounded-xl shadow-lg border border-gray-200 py-1 w-52 overflow-hidden">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <Share2 className="w-4 h-4 shrink-0" />
                    <span>Chia sẻ ngay</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsShareMenuOpen(false); setIsShareToStoryModalOpen(true); }}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <Newspaper className="w-4 h-4 shrink-0" />
                    <span>Chia sẻ lên tin</span>
                  </button>
                </div>
              </>
            )}
          </div>
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

      {isShareToStoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="relative border-b border-gray-200 px-4 py-4 text-center">
              <h2 className="text-lg font-bold text-gray-900">Chia sẻ lên tin</h2>
              <button
                type="button"
                onClick={() => setIsShareToStoryModalOpen(false)}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {image ? (
                <div className="rounded-lg overflow-hidden bg-black max-h-48 flex items-center justify-center">
                  <img src={image} alt="Nội dung bài viết" className="max-h-48 w-full object-contain" />
                </div>
              ) : (
                <div className="rounded-lg bg-blue-600 p-4 min-h-[80px] flex items-center justify-center">
                  <p className="text-white text-sm font-medium text-center line-clamp-4">{content}</p>
                </div>
              )}
              <p className="text-sm text-gray-500 text-center">
                Tin sẽ hiển thị trong 24 giờ và xóa tự động.
              </p>
            </div>

            <div className="flex gap-2 px-4 pb-4">
              <button
                type="button"
                onClick={() => setIsShareToStoryModalOpen(false)}
                className="flex-1 cursor-pointer rounded-lg bg-gray-100 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleShareToStory}
                disabled={isSharingToStory}
                className="flex-1 cursor-pointer rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSharingToStory ? 'Đang đăng...' : 'Đăng tin'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              className="cursor-pointer bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 dark:bg-red-600 dark:hover:bg-red-700"
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


