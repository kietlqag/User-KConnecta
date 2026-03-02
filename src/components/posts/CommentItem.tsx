import { useState } from 'react';
import { ThumbsUp, MoreHorizontal } from 'lucide-react';

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
  isReply?: boolean;
}

export function CommentItem({ comment, isReply = false }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  return (
    <div className={`flex gap-2 ${isReply ? 'ml-10' : ''}`}>
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

        {/* Comment Actions */}
        <div className="flex items-center gap-3 mt-1 px-3">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`text-xs font-semibold hover:underline ${
              isLiked ? 'text-emerald-600' : 'text-gray-600'
            }`}
          >
            Thích
          </button>
          <button className="text-xs font-semibold text-gray-600 hover:underline">
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

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {!showReplies ? (
              <button
                onClick={() => setShowReplies(true)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:underline px-3"
              >
                <div className="w-6 h-0.5 bg-gray-400"></div>
                {comment.replies.length} phản hồi
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowReplies(false)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:underline px-3 mb-2"
                >
                  <div className="w-6 h-0.5 bg-gray-400"></div>
                  Ẩn phản hồi
                </button>
                <div className="space-y-3">
                  {comment.replies.map((reply) => (
                    <CommentItem key={reply.id} comment={reply} isReply />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* More Options */}
      <button className="p-1 hover:bg-gray-100 rounded-full h-fit opacity-0 group-hover:opacity-100 transition-opacity">
        <MoreHorizontal className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  );
}
