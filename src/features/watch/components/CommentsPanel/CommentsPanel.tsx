import { X, ThumbsUp, MoreHorizontal } from 'lucide-react';
import { ReelComment } from '../../types/watch.types';

interface CommentsPanelProps {
  comments: ReelComment[];
  onClose: () => void;
}

export const CommentsPanel = ({ comments, onClose }: CommentsPanelProps) => {
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
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            {/* Avatar */}
            <img
              src={comment.author.avatar}
              alt={comment.author.name}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />

            {/* Comment Content */}
            <div className="flex-1 min-w-0">
              <div className="bg-[#2a2d31] rounded-2xl px-4 py-2">
                <h4 className="text-white font-semibold text-sm">
                  {comment.author.name}
                </h4>
                <p className="text-gray-200 text-sm mt-1">{comment.content}</p>
              </div>

              {/* Comment Actions */}
              <div className="flex items-center gap-4 mt-1 ml-2">
                <span className="text-gray-400 text-xs">{comment.timestamp}</span>
                <button className="text-gray-400 hover:text-white text-xs font-semibold transition-colors">
                  Thích
                </button>
                <button className="text-gray-400 hover:text-white text-xs font-semibold transition-colors">
                  Trả lời
                </button>
                {comment.likes > 0 && (
                  <div className="flex items-center gap-1 ml-auto">
                    <ThumbsUp className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                    <span className="text-gray-400 text-xs">
                      {formatCount(comment.likes)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* More Options */}
            <button className="w-8 h-8 rounded-full hover:bg-gray-700 flex items-center justify-center transition-colors flex-shrink-0">
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ))}
      </div>

      {/* Comment Input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <img
            src="https://images.unsplash.com/photo-1695800998493-ccff5ea292ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHByb2Zlc3Npb25hbCUyMEFzaWFuJTIweY91bmclMjBtYW58ZW58MXx8fHwxNzY5NjY2MzY5fDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Your avatar"
            className="w-8 h-8 rounded-full object-cover"
          />
          <input
            type="text"
            placeholder="Viết bình luận..."
            className="flex-1 bg-[#2a2d31] text-white rounded-full px-4 py-2 text-sm outline-none focus:bg-[#35383d] transition-colors"
          />
        </div>
      </div>
    </div>
  );
};
