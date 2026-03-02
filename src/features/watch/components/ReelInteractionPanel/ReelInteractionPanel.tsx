import { ThumbsUp, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';

interface ReelInteractionPanelProps {
  likes: number;
  comments: number;
  shares: number;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onMore: () => void;
}

export const ReelInteractionPanel = ({
  likes,
  comments,
  shares,
  onLike,
  onComment,
  onShare,
  onMore,
}: ReelInteractionPanelProps) => {
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="flex flex-col gap-6 items-center">
      {/* Like Button */}
      <button
        onClick={onLike}
        className="flex flex-col items-center gap-1 group transition-transform hover:scale-110"
      >
        <div className="w-12 h-12 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
          <ThumbsUp className="w-6 h-6 text-white" />
        </div>
        <span className="text-sm font-semibold text-white">
          {formatCount(likes)}
        </span>
      </button>

      {/* Comment Button */}
      <button
        onClick={onComment}
        className="flex flex-col items-center gap-1 group transition-transform hover:scale-110"
      >
        <div className="w-12 h-12 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-blue-600 transition-colors">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <span className="text-sm font-semibold text-white">
          {formatCount(comments)}
        </span>
      </button>

      {/* Share Button */}
      <button
        onClick={onShare}
        className="flex flex-col items-center gap-1 group transition-transform hover:scale-110"
      >
        <div className="w-12 h-12 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-purple-600 transition-colors">
          <Share2 className="w-6 h-6 text-white" />
        </div>
        <span className="text-sm font-semibold text-white">
          {formatCount(shares)}
        </span>
      </button>

      {/* More Button */}
      <button
        onClick={onMore}
        className="flex flex-col items-center gap-1 group transition-transform hover:scale-110"
      >
        <div className="w-12 h-12 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-gray-600 transition-colors">
          <MoreHorizontal className="w-6 h-6 text-white" />
        </div>
      </button>
    </div>
  );
};
