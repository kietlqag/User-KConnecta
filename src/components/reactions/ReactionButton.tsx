import { useRef, useState, useEffect } from 'react';
import { ThumbsUp } from 'lucide-react';
import type { ReactionType } from '@/services/postService';

export interface ReactionOption {
  type: ReactionType;
  emoji: string;
  label: string;
  color: string;
}

export const reactions: ReactionOption[] = [
  { type: 'LIKE', emoji: '👍', label: 'Thích', color: 'text-blue-500' },
  { type: 'LOVE', emoji: '❤️', label: 'Yêu thích', color: 'text-red-500' },
  { type: 'HAHA', emoji: '😆', label: 'Haha', color: 'text-yellow-500' },
  { type: 'WOW', emoji: '😮', label: 'Wow', color: 'text-yellow-500' },
  { type: 'SAD', emoji: '😢', label: 'Buồn', color: 'text-yellow-500' },
  { type: 'ANGRY', emoji: '😡', label: 'Phẫn nộ', color: 'text-orange-500' },
];

interface ReactionButtonProps {
  initialReaction?: ReactionOption | null;
  onReactionChange?: (reaction: ReactionOption | null) => void;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  /** Vertical icon + count layout for Watch / Reels */
  variant?: 'default' | 'reel';
  count?: number;
}

function formatReelCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

export function ReactionButton({
  initialReaction = null,
  onReactionChange,
  className = '',
  buttonClassName = '',
  disabled = false,
  variant = 'default',
  count = 0,
}: ReactionButtonProps) {
  const [selectedReaction, setSelectedReaction] = useState<ReactionOption | null>(initialReaction);
  const [showReactions, setShowReactions] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSelectedReaction(initialReaction);
  }, [initialReaction]);

  const handleMouseEnter = () => {
    if (disabled) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowReactions(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowReactions(false);
      setHoveredReaction(null);
    }, 300);
  };

  const applyReaction = (reaction: ReactionOption | null) => {
    setSelectedReaction(reaction);
    onReactionChange?.(reaction);
    setShowReactions(false);
  };

  const handleButtonClick = () => {
    if (disabled) return;
    if (selectedReaction) {
      applyReaction(null);
      return;
    }
    applyReaction(reactions[0]);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const pickerPositionClass =
    variant === 'reel'
      ? 'absolute right-full top-1/2 -translate-y-1/2 mr-3'
      : 'absolute bottom-full left-0 mb-2';

  const picker = (
    <div
      className={`${pickerPositionClass} transition-all duration-200 ease-out ${
        showReactions
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : variant === 'reel'
            ? 'opacity-0 translate-x-2 pointer-events-none'
            : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <div className="bg-white rounded-full shadow-lg border border-gray-200 px-2 py-2 flex items-center gap-1">
        {reactions.map((reaction, index) => (
          <button
            key={reaction.type}
            onClick={() =>
              applyReaction(selectedReaction?.type === reaction.type ? null : reaction)
            }
            onMouseEnter={() => setHoveredReaction(index)}
            onMouseLeave={() => setHoveredReaction(null)}
            className={`text-2xl transition-all duration-150 ease-out hover:scale-125 ${
              hoveredReaction === index ? 'scale-125 -translate-y-1' : 'scale-100'
            }`}
            style={{ padding: '4px' }}
            aria-label={reaction.label}
            type="button"
          >
            {reaction.emoji}
          </button>
        ))}
      </div>
    </div>
  );

  if (variant === 'reel') {
    return (
      <div
        className={`relative flex flex-col items-center gap-1 ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {picker}
        <button
          onClick={handleButtonClick}
          disabled={disabled}
          className={`flex flex-col items-center gap-1 group transition-transform hover:scale-110 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${buttonClassName}`}
          type="button"
        >
          <div
            className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors ${
              selectedReaction
                ? 'bg-emerald-600'
                : 'bg-gray-800/50 group-hover:bg-emerald-600'
            }`}
          >
            {selectedReaction ? (
              <span className="text-2xl leading-none">{selectedReaction.emoji}</span>
            ) : (
              <ThumbsUp className="w-6 h-6 text-white" />
            )}
          </div>
          <span className="text-sm font-semibold text-white">{formatReelCount(count)}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {picker}

      <button
        onClick={handleButtonClick}
        disabled={disabled}
        className={`flex w-full items-center justify-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-60 ${
          selectedReaction ? selectedReaction.color : 'text-gray-600'
        } ${buttonClassName}`}
        type="button"
      >
        {selectedReaction ? (
          <>
            <span className="text-xl">{selectedReaction.emoji}</span>
            <span className="font-medium">{selectedReaction.label}</span>
          </>
        ) : (
          <>
            <ThumbsUp className="w-5 h-5" />
            <span className="font-medium">Thích</span>
          </>
        )}
      </button>
    </div>
  );
}

