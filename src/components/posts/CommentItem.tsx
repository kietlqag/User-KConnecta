import { useState } from 'react';
import { ThumbsUp, MoreHorizontal } from 'lucide-react';
import { CommentInput } from './CommentInput';
import { authService } from '@/services/authService';

export interface Comment {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  likes?: number;
  replies?: Comment[];
}

interface CommentItemProps {
  comment: Comment;
  depth?: number;
  onReply: (content: string, parentId: string) => Promise<void>;
}

export function CommentItem({ comment, depth = 0, onReply }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const currentUser = authService.getCurrentUser();
  // Cap indent at 4 levels to avoid over-nesting
  const indent = Math.min(depth, 4) * 40;

  const handleReplySubmit = async (content: string) => {
    try {
      setIsSubmittingReply(true);
      await onReply(content, comment.id);
      setShowReplyInput(false);
      setShowReplies(true);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <div style={{ marginLeft: depth > 0 ? indent : 0 }}>
      <div className="flex gap-2 group">
        <img
          src={comment.author.avatar}
          alt={comment.author.name}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1">
          {/* Comment Bubble */}
          <div className="bg-gray-100 rounded-2xl px-3 py-2 inline-block max-w-full">
            <p className="font-semibold text-[13px] mb-0.5">{comment.author.name}</p>
            <p className="text-[15px] break-words">{comment.content}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-1 px-3">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`text-xs font-semibold hover:underline cursor-pointer ${isLiked ? 'text-emerald-600' : 'text-gray-600'}`}
            >
              Thích
            </button>
            <button
              onClick={() => setShowReplyInput((v) => !v)}
              className="text-xs font-semibold text-gray-600 hover:underline cursor-pointer"
            >
              Trả lời
            </button>
            <span className="text-xs text-gray-500">{comment.timestamp}</span>
            {comment.likes && comment.likes > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <ThumbsUp className="w-2.5 h-2.5 text-white fill-white" />
                </div>
                <span className="text-xs text-gray-600">{comment.likes}</span>
              </div>
            )}
          </div>

          {/* Inline reply input */}
          {showReplyInput && (
            <div className={`mt-2 ${isSubmittingReply ? 'pointer-events-none opacity-70' : ''}`}>
              <CommentInput
                onSubmit={handleReplySubmit}
                userAvatar={currentUser?.avatarUrl}
                placeholder={`Trả lời ${comment.author.name}...`}
                autoFocus
              />
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {!showReplies ? (
                <button
                  onClick={() => setShowReplies(true)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:underline px-3 cursor-pointer"
                >
                  <div className="w-6 h-0.5 bg-gray-400" />
                  {comment.replies.length} phản hồi
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowReplies(false)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:underline px-3 mb-2 cursor-pointer"
                  >
                    <div className="w-6 h-0.5 bg-gray-400" />
                    Ẩn phản hồi
                  </button>
                  {/* DFS: render each reply recursively */}
                  <div className="space-y-3">
                    {comment.replies.map((reply) => (
                      <CommentItem
                        key={reply.id}
                        comment={reply}
                        depth={depth + 1}
                        onReply={onReply}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <button className="p-1 hover:bg-gray-100 rounded-full h-fit opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
          <MoreHorizontal className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
