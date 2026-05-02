import { useState, useEffect } from 'react';
import { X, ThumbsUp, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { postService, type PostCommentResponse } from '@/services/postService';

interface CommentsPanelProps {
  postId: string;
  onClose: () => void;
  onCommentCountChange?: (delta: number) => void;
}

export const CommentsPanel = ({ postId, onClose, onCommentCountChange }: CommentsPanelProps) => {
  const [comments, setComments] = useState<PostCommentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    let isMounted = true;
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        const response = await postService.getComments(postId);
        if (isMounted) {
          setComments(response);
        }
      } catch (error) {
        if (isMounted) {
          toast.error('Không thể tải bình luận');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchComments();
    return () => { isMounted = false; };
  }, [postId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để bình luận');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await postService.addComment(postId, {
        userId: currentUser.id,
        content: newComment.trim(),
      });
      setComments(prev => [...prev, response]);
      setNewComment('');
      onCommentCountChange?.(1);
    } catch (error) {
      toast.error('Không thể gửi bình luận');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="w-[400px] bg-[#1c1e21] h-full flex flex-col border-l border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h2 className="text-white font-semibold text-lg">
          Bình luận ({comments.length})
        </h2>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-gray-200" />
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="text-gray-400 text-center text-sm">Đang tải bình luận...</div>
        ) : comments.length === 0 ? (
          <div className="text-gray-400 text-center text-sm">Chưa có bình luận nào</div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              {/* Avatar */}
              <img
                src={comment.userAvatarUrl || `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(comment.userFullName || 'User')}`}
                alt={comment.userFullName}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />

              {/* Comment Content */}
              <div className="flex-1 min-w-0">
                <div className="bg-[#2a2d31] rounded-2xl px-4 py-2">
                  <h4 className="text-white font-semibold text-sm">
                    {comment.userFullName}
                  </h4>
                  <p className="text-gray-200 text-sm mt-1">{comment.content}</p>
                </div>

                {/* Comment Actions */}
                <div className="flex items-center gap-4 mt-1 ml-2">
                  <button className="text-gray-400 hover:text-white text-xs font-semibold transition-colors">
                    Thích
                  </button>
                  <button className="text-gray-400 hover:text-white text-xs font-semibold transition-colors">
                    Trả lời
                  </button>
                </div>
              </div>

              {/* More Options */}
              <button className="w-8 h-8 rounded-full hover:bg-gray-700 flex items-center justify-center transition-colors flex-shrink-0">
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Comment Input */}
      <div className={`p-4 border-t border-gray-800 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2">
          <img
            src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(currentUser?.fullName || 'User')}`}
            alt="Your avatar"
            className="w-8 h-8 rounded-full object-cover"
          />
          <input
            type="text"
            placeholder="Viết bình luận..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-[#2a2d31] text-white rounded-full px-4 py-2 text-sm outline-none focus:bg-[#35383d] transition-colors"
          />
        </div>
      </div>
    </div>
  );
};
