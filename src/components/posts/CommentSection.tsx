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
  return {
    id: comment.id,
    author: {
      name: comment.userFullName,
      avatar:
        comment.userAvatarUrl ||
        'https://images.unsplash.com/photo-1724435811349-32d27f4d5806?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjBhdmF0YXIlMjBwcm9maWxlfGVufDF8fHx8MTc2OTYxOTc2NHww&ixlib=rb-4.1.0&q=80&w=400',
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

    // Fallback: if parent is missing, still render this comment at root level.
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
          toast.error(error instanceof Error ? error.message : 'Khong the tai binh luan');
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
      toast.error('Ban can dang nhap de binh luan');
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
            'https://images.unsplash.com/photo-1724435811349-32d27f4d5806?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjBhdmF0YXIlMjBwcm9maWxlfGVufDF8fHx8MTc2OTYxOTc2NHww&ixlib=rb-4.1.0&q=80&w=400',
        },
        content: response.content,
        timestamp: 'Vua xong',
        likes: 0,
        replies: [],
      };

      setComments((prev) => [...prev, newComment]);
      onCommentAdded?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Khong the gui binh luan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-3">
      {isLoading ? (
        <div className="py-4 text-sm text-gray-500">Dang tai binh luan...</div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative mb-3 h-20 w-20">
            <div className="absolute inset-0 rotate-6 rounded-lg bg-gray-200" />
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-300">
              <FileText className="h-10 w-10 text-gray-500" />
            </div>
          </div>
          <h3 className="mb-1 text-[17px] font-semibold text-gray-800">Chua co binh luan nao</h3>
          <p className="text-[15px] text-gray-600">Hay la nguoi dau tien binh luan.</p>
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
        <CommentInput onSubmit={handleAddComment} userAvatar={authService.getCurrentUser()?.avatarUrl} />
      </div>
    </div>
  );
}
