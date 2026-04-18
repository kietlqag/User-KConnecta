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
  { type: 'LIKE', emoji: '??', label: 'Thích', color: 'text-blue-500' },
  { type: 'LOVE', emoji: '??', label: 'Yêu thích', color: 'text-red-500' },
  { type: 'HAHA', emoji: '??', label: 'Haha', color: 'text-yellow-500' },
  { type: 'WOW', emoji: '??', label: 'Wow', color: 'text-yellow-500' },
  { type: 'SAD', emoji: '??', label: 'Bu?n', color: 'text-yellow-500' },
  { type: 'ANGRY', emoji: '??', label: 'Ph?n n?', color: 'text-orange-500' },
];

interface ReactionButtonProps {
  initialReaction?: ReactionOption | null;
  onReactionChange?: (reaction: ReactionOption | null) => void;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
}

export function ReactionButton({
  initialReaction = null,
  onReactionChange,
  className = '',
  buttonClassName = '',
  disabled = false,
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

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`absolute bottom-full left-0 mb-2 transition-all duration-200 ease-out ${
          showReactions
            ? 'opacity-100 translate-y-0 pointer-events-auto'
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
