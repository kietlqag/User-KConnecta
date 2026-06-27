import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, MessageCircle, Share2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { postService, type PostReactionCountResponse, type ReactionType } from '@/services/postService';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { PostDetailModal } from '../../../../components/posts/PostDetailModal';
import { PostShareModal } from '../../../../components/posts/PostShareModal';
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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
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
        id: authorId,
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
    [authorId, commentCount, content, id, image, likeCount, reactionCounts, shareCount, timestamp, userAvatar, userName],
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
      <div className="bg-card rounded-lg shadow mb-4">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 group">
              <div
                className="cursor-pointer"
                onClick={() => navigate(`/profile/${authorId}`)}
              >
                <UserAvatar
                  name={userName}
                  avatarUrl={userAvatar}
                  userId={authorId}
                  className="w-10 h-10"
                  rounded="full"
                  initialsClassName="text-sm font-bold"
                />
              </div>
              <div 
                className="cursor-pointer"
                onClick={() => navigate(`/profile/${authorId}`)}
              >
                <h3 className="font-semibold text-foreground group-hover:underline">{userName}</h3>
                <p className="text-sm text-muted-foreground">{timestamp}</p>
              </div>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                className="cursor-pointer rounded-full p-2 transition-colors hover:bg-muted"
              >
                <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
              </button>
              {isMoreMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsMoreMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg">
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

          <p className="text-foreground mb-3">{content}</p>
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

        <div className="px-4 py-2 flex items-center justify-between text-sm text-muted-foreground">
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
      />

      <ReactionSummaryDialog
        open={isReactionSummaryOpen}
        onOpenChange={setIsReactionSummaryOpen}
        postId={id}
        reactionCounts={reactionCounts}
      />

      <PostShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        postId={id}
        postContent={content}
        postImage={image}
        postAuthorName={userName}
        onShareComplete={(response) => setShareCount(response.shareCount)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border border-border bg-card sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Xóa bài viết</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Bạn có chắc muốn xóa bài viết không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer border-border">Không</AlertDialogCancel>
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


