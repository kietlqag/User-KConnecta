import { MessageCircle, Share2 } from 'lucide-react';
import { ReactionButton, type ReactionOption } from '@/components/reactions';
import { ReelMoreMenu } from '../ReelMoreMenu';

interface ReelInteractionPanelProps {
  postId: string;
  likes: number;
  comments: number;
  shares: number;
  selectedReaction: ReactionOption | null;
  onReactionChange: (reaction: ReactionOption | null) => void;
  isReacting?: boolean;
  isSaved?: boolean;
  isOwner?: boolean;
  onComment: () => void;
  onShare: () => void;
}

export const ReelInteractionPanel = ({
  likes,
  comments,
  shares,
  selectedReaction,
  onReactionChange,
  isReacting = false,
  isSaved = false,
  isOwner = false,
  postId,
  onComment,
  onShare,
}: ReelInteractionPanelProps) => {
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="flex flex-col gap-6 items-center">
      <ReactionButton
        variant="reel"
        initialReaction={selectedReaction}
        onReactionChange={onReactionChange}
        count={likes}
        disabled={isReacting}
      />

      <button
        onClick={onComment}
        className="flex flex-col items-center gap-1 group transition-transform hover:scale-110 cursor-pointer"
        type="button"
      >
        <div className="w-12 h-12 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-blue-600 transition-colors">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <span className="text-sm font-semibold text-white">
          {formatCount(comments)}
        </span>
      </button>

      <button
        onClick={onShare}
        className="flex flex-col items-center gap-1 group transition-transform hover:scale-110 cursor-pointer"
        type="button"
      >
        <div className="w-12 h-12 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-purple-600 transition-colors">
          <Share2 className="w-6 h-6 text-white" />
        </div>
        <span className="text-sm font-semibold text-white">
          {formatCount(shares)}
        </span>
      </button>

      <ReelMoreMenu postId={postId} isSaved={isSaved} isOwner={isOwner} />
    </div>
  );
};
