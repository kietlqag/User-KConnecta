import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { postService, type PostCommentResponse } from '@/services/postService';
import { CommentInput } from './CommentInput';
import { CommentItem, type Comment } from './CommentItem';

interface CommentSectionProps {
  postId: string;
  initialComments?: Comment[];
  onCommentAdded?: () => void;
  onCommentsLoaded?: (count: number) => void;
}

function formatCommentTime(createdAt: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(createdAt));
}

function mapComment(comment: PostCommentResponse): Comment {
  const fallbackAvatar = `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(comment.userFullName || 'User')}`;

  return {
    id: comment.id,
    author: {
      name: comment.userFullName,
      avatar: comment.userAvatarUrl || fallbackAvatar,
    },
    content: comment.content,
    timestamp: formatCommentTime(comment.createdAt),
    likes: 0,
    replies: [],
  };
}

function buildCommentTree(items: PostCommentResponse[]) {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  items.forEach((item) => {
    commentMap.set(String(item.id), mapComment(item));
  });

  items.forEach((item) => {
    const mapped = commentMap.get(String(item.id));
    if (!mapped) {
      return;
    }

    const parentId = item.parentCommentId ? String(item.parentCommentId) : null;
    if (parentId) {
      const parent = commentMap.get(parentId);
      if (parent) {
        parent.replies = [...(parent.replies || []), mapped];
        return;
      }
    }

    rootComments.push(mapped);
  });

  return rootComments;
}

export function CommentSection({
  postId,
  initialComments = [],
  onCommentAdded,
  onCommentsLoaded,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchComments = async () => {
      try {
        setIsLoading(true);
        const response = await postService.getComments(postId);
        if (!isMounted) {
          return;
        }

        setComments(buildCommentTree(response));
        onCommentsLoaded?.(response.length);
      } catch (error) {
        if (isMounted) {
          toast.error(error instanceof Error ? error.message : 'Không thể tải bình luận');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchComments();

    return () => {
      isMounted = false;
    };
  }, [onCommentsLoaded, postId]);

  const handleAddComment = async (content: string) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để bình luận');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await postService.addComment(postId, {
        userId: currentUser.id,
        content,
      });

      const newComment: Comment = {
        id: response.id,
        author: {
          name: response.userFullName || currentUser.fullName,
          avatar:
            response.userAvatarUrl ||
            currentUser.avatarUrl ||
            `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(response.userFullName || currentUser.fullName || 'User')}`,
        },
        content: response.content,
        timestamp: 'Vừa xong',
        likes: 0,
        replies: [],
      };

      setComments((prev) => [...prev, newComment]);
      onCommentAdded?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể gửi bình luận');
    } finally {
      setIsSubmitting(false);
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
              <CommentItem comment={comment} />
            </div>
          ))}
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


