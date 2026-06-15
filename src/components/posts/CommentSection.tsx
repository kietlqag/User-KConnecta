import { useEffect, useState, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { postService, type PostCommentResponse } from '@/services/postService';
import { CommentInput } from './CommentInput';
import { CommentItem, type Comment } from './CommentItem';

interface CommentSectionProps {
  postId: string;
  onCommentAdded?: () => void;
  onCommentsLoaded?: (count: number) => void;
}

const PAGE_SIZE = 10;

function formatCommentTime(createdAt: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(createdAt));
}

function mapToComment(r: PostCommentResponse): Comment {
  const fallbackAvatar = `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(r.userFullName || 'User')}`;
  return {
    id: r.id,
    postId: r.postId,
    userId: r.userId,
    author: {
      name: r.userFullName,
      avatar: r.userAvatarUrl || fallbackAvatar,
    },
    content: r.content ?? '',
    timestamp: formatCommentTime(r.createdAt),
    likeCount: r.likeCount,
    isLikedByCurrentUser: r.isLikedByCurrentUser,
    isDeleted: r.isDeleted,
    replyCount: r.replyCount,
    replies: [],
  };
}

export function CommentSection({ postId, onCommentAdded, onCommentsLoaded }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPage = useCallback(async (pageIndex: number, append: boolean) => {
    try {
      if (append) setIsLoadingMore(true);
      else setIsLoading(true);

      const currentUser = authService.getCurrentUser();
      const res = await postService.getComments(postId, pageIndex, PAGE_SIZE, currentUser?.id);
      const mapped = res.content.map(mapToComment);

      setComments((prev) => (append ? [...prev, ...mapped] : mapped));
      setHasMore(pageIndex + 1 < res.totalPages);
      setTotalElements(res.totalElements);
      if (!append) onCommentsLoaded?.(res.totalElements);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải bình luận');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [postId, onCommentsLoaded]);

  useEffect(() => {
    setComments([]);
    setPage(0);
    setHasMore(false);
    void fetchPage(0, false);
  }, [fetchPage]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    void fetchPage(nextPage, true);
  };

  const handleAddComment = async (content: string) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để bình luận');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await postService.addComment(postId, { userId: currentUser.id, content });

      const newComment: Comment = {
        id: response.id,
        postId: response.postId,
        userId: currentUser.id,
        author: {
          name: response.userFullName || currentUser.fullName,
          avatar:
            response.userAvatarUrl ||
            currentUser.avatarUrl ||
            `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(response.userFullName || currentUser.fullName || 'User')}`,
        },
        content: response.content,
        timestamp: 'Vừa xong',
        likeCount: 0,
        isLikedByCurrentUser: false,
        replyCount: 0,
        replies: [],
      };

      setComments((prev) => [...prev, newComment]);
      if (response.moderationStatus === 'PENDING') {
        toast.info('Bình luận đang chờ kiểm duyệt. Chỉ bạn thấy cho đến khi được duyệt.');
      } else {
        setTotalElements((n) => n + 1);
        onCommentAdded?.();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể gửi bình luận');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setTotalElements((n) => n - 1);
  };

  const handleUpdateComment = (commentId: string, newContent: string) => {
    setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, content: newContent } : c));
  };

  const handleAddReply = async (content: string, parentCommentId: string) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để trả lời');
      return;
    }

    try {
      const response = await postService.addComment(postId, {
        userId: currentUser.id,
        content,
        parentCommentId,
      });

      if (response.moderationStatus === 'PENDING') {
        toast.info('Phản hồi đang chờ kiểm duyệt. Chỉ bạn thấy cho đến khi được duyệt.');
        return;
      }

      // Update replyCount on the parent comment so the button label stays correct
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentCommentId ? { ...c, replyCount: c.replyCount + 1 } : c,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể gửi trả lời');
      throw error;
    }
  };

  return (
    <div className="px-4 py-3">
      {isLoading ? (
        <div className="py-4 text-sm text-gray-500">Đang tải bình luận...</div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative mb-3 h-20 w-20">
            <div className="absolute inset-0 rotate-6 rounded-lg bg-gray-200" />
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-300">
              <FileText className="h-10 w-10 text-gray-500" />
            </div>
          </div>
          <h3 className="mb-1 text-[17px] font-semibold text-gray-800">Chưa có bình luận nào</h3>
          <p className="text-[15px] text-gray-600">Hãy là người đầu tiên bình luận.</p>
        </div>
      ) : (
        <div className="mb-4 space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="group">
              <CommentItem comment={comment} depth={0} onReply={handleAddReply} onDelete={handleDeleteComment} onUpdate={handleUpdateComment} />
            </div>
          ))}

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="text-sm font-semibold text-gray-600 hover:underline disabled:opacity-60 cursor-pointer"
            >
              {isLoadingMore
                ? 'Đang tải...'
                : `Xem thêm bình luận (${totalElements - comments.length} còn lại)`}
            </button>
          )}
        </div>
      )}

      <div className={isSubmitting ? 'pointer-events-none opacity-70' : ''}>
        <CommentInput
          onSubmit={handleAddComment}
          userAvatar={authService.getCurrentUser()?.avatarUrl}
          placeholder={`Bình luận dưới tên ${authService.getCurrentUser()?.fullName || 'bạn'}`}
        />
      </div>
    </div>
  );
}
