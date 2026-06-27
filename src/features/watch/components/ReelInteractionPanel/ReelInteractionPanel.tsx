import { ChevronDown, ChevronUp, MessageCircle, Share2 } from 'lucide-react';
import { ReactionButton, type ReactionOption } from '@/components/reactions';
import { ReelMoreMenu } from '../ReelMoreMenu';
import { ReelActionButton, reelActionIconClass } from '../ReelActionButton';

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
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
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
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
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

  const showNavigation = Boolean(onPrevious && onNext);

  return (
    <div className="flex flex-col items-center gap-4">
      <ReactionButton
        variant="reel"
        initialReaction={selectedReaction}
        onReactionChange={onReactionChange}
        count={likes}
        disabled={isReacting}
      />

      <ReelActionButton onClick={onComment} count={formatCount(comments)} ariaLabel="Bình luận">
        <MessageCircle className="h-5 w-5" strokeWidth={2.25} />
      </ReelActionButton>

      <ReelActionButton onClick={onShare} count={formatCount(shares)} ariaLabel="Chia sẻ">
        <Share2 className="h-5 w-5" strokeWidth={2.25} />
      </ReelActionButton>

      <ReelMoreMenu postId={postId} isSaved={isSaved} isOwner={isOwner} />

      {showNavigation && (
        <>
          <div className="my-0.5 h-px w-9 bg-muted" aria-hidden />
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onPrevious}
              disabled={!hasPrevious}
              aria-label="Video trước"
              className={reelActionIconClass}
            >
              <ChevronUp className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Video tiếp theo"
              className={reelActionIconClass}
            >
              <ChevronDown className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
