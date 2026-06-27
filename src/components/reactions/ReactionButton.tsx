import { useRef, useState, useEffect, useCallback } from 'react';
import { ThumbsUp } from 'lucide-react';
import type { ReactionType } from '@/services/postService';

export interface ReactionOption {
  type: ReactionType;
  emoji: string;
  label: string;
  color: string;
}

const CDN = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg';

export const reactions: ReactionOption[] = [
  { type: 'LIKE',  emoji: `${CDN}/1f44d.svg`,   label: 'Thích',     color: 'text-emerald-500'   },
  { type: 'LOVE',  emoji: `${CDN}/2764.svg`,     label: 'Yêu thích', color: 'text-red-500'    },
  { type: 'HAHA',  emoji: `${CDN}/1f606.svg`,    label: 'Haha',      color: 'text-yellow-500' },
  { type: 'WOW',   emoji: `${CDN}/1f62e.svg`,    label: 'Wow',       color: 'text-yellow-500' },
  { type: 'SAD',   emoji: `${CDN}/1f622.svg`,    label: 'Buồn',      color: 'text-yellow-500' },
  { type: 'ANGRY', emoji: `${CDN}/1f621.svg`,    label: 'Phẫn nộ',  color: 'text-orange-500' },
];

interface ReactionButtonProps {
  initialReaction?: ReactionOption | null;
  onReactionChange?: (reaction: ReactionOption | null) => void;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  variant?: 'default' | 'reel';
  count?: number;
  compact?: boolean;
  pickerAlign?: 'left' | 'right';
}

function formatReelCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000)     return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

// Total time for all entrance animations to finish: last delay + duration
const ENTRANCE_TOTAL_MS = (reactions.length - 1) * 25 + 280;
const STAGGER_MS = 25;

export function ReactionButton({
  initialReaction = null,
  onReactionChange,
  className = '',
  buttonClassName = '',
  disabled = false,
  variant = 'default',
  count = 0,
  compact = false,
  pickerAlign = 'left',
}: ReactionButtonProps) {
  const [selectedReaction, setSelectedReaction]   = useState<ReactionOption | null>(initialReaction);
  const [showReactions, setShowReactions]         = useState(false);
  const [isClosing, setIsClosing]                 = useState(false);
  const [hasEntered, setHasEntered]               = useState(false);
  const [hoveredReaction, setHoveredReaction]     = useState<number | null>(null);
  const [selectingIndex, setSelectingIndex]       = useState<number | null>(null);
  const [isLikeAnimating, setIsLikeAnimating]     = useState(false);

  const hoverTimerRef   = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef   = useRef<NodeJS.Timeout | null>(null);
  const entryTimerRef   = useRef<NodeJS.Timeout | null>(null);
  const selectTimerRef  = useRef<NodeJS.Timeout | null>(null);
  const likeTimerRef    = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setSelectedReaction(initialReaction); }, [initialReaction]);

  const clearTimer = (ref: React.MutableRefObject<NodeJS.Timeout | null>) => {
    if (ref.current) { clearTimeout(ref.current); ref.current = null; }
  };

  const openPicker = useCallback(() => {
    if (disabled) return;
    clearTimer(closeTimerRef);
    clearTimer(entryTimerRef);
    setIsClosing(false);
    setHasEntered(false);
    setShowReactions(true);
    entryTimerRef.current = setTimeout(() => setHasEntered(true), ENTRANCE_TOTAL_MS);
  }, [disabled]);

  const startClose = useCallback(() => {
    clearTimer(entryTimerRef);
    setIsClosing(true);
    setHasEntered(false);
    closeTimerRef.current = setTimeout(() => {
      setShowReactions(false);
      setIsClosing(false);
      setHoveredReaction(null);
    }, 180);
  }, []);

  const handleMouseEnter = () => {
    if (disabled) return;
    clearTimer(hoverTimerRef);
    openPicker();
  };

  const handleMouseLeave = () => {
    hoverTimerRef.current = setTimeout(startClose, 200);
  };

  const triggerLikeAnim = () => {
    clearTimer(likeTimerRef);
    setIsLikeAnimating(true);
    likeTimerRef.current = setTimeout(() => setIsLikeAnimating(false), 420);
  };

  const applyReaction = (reaction: ReactionOption | null, index?: number) => {
    if (index !== undefined) {
      clearTimer(selectTimerRef);
      setSelectingIndex(index);
      selectTimerRef.current = setTimeout(() => setSelectingIndex(null), 420);
    }
    triggerLikeAnim();
    setSelectedReaction(reaction);
    onReactionChange?.(reaction);
    // Brief delay so pop animation plays before picker closes
    setTimeout(() => {
      setShowReactions(false);
      setIsClosing(false);
      setHasEntered(false);
    }, 160);
  };

  const handleButtonClick = () => {
    if (disabled) return;
    triggerLikeAnim();
    if (selectedReaction) {
      setSelectedReaction(null);
      onReactionChange?.(null);
    } else {
      setSelectedReaction(reactions[0]);
      onReactionChange?.(reactions[0]);
    }
  };

  useEffect(() => () => {
    clearTimer(hoverTimerRef);
    clearTimer(closeTimerRef);
    clearTimer(entryTimerRef);
    clearTimer(selectTimerRef);
    clearTimer(likeTimerRef);
  }, []);

  // Per-emoji animation style
  const getEmojiStyle = (index: number): React.CSSProperties => {
    if (selectingIndex === index) {
      return { animation: 'reaction-pop 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both' };
    }
    if (hasEntered) {
      // Switch to pure transition after entrance — no keyframe conflict
      return {
        transform: hoveredReaction === index ? 'scale(1.48) translateY(-9px)' : 'scale(1) translateY(0)',
        transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
      };
    }
    return {
      animation: `reaction-entrance 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * STAGGER_MS}ms both`,
    };
  };

  const pickerPositionClass =
    variant === 'reel'
      ? 'absolute right-full top-1/2 -translate-y-1/2 mr-3'
      : `absolute bottom-full mb-2 ${pickerAlign === 'right' ? 'right-0' : 'left-0'}`;

  const picker = showReactions ? (
    <div
      className={`${pickerPositionClass} z-50`}
      style={isClosing ? { animation: 'reaction-picker-out 0.18s ease-in forwards' } : undefined}
    >
      <div
        className="flex items-center gap-0.5 rounded-full border border-border bg-surface px-2 py-1.5"
        style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.13), 0 2px 6px rgba(0,0,0,0.07)' }}
      >
        {reactions.map((reaction, index) => (
          <button
            key={reaction.type}
            type="button"
            aria-label={reaction.label}
            onClick={() =>
              applyReaction(selectedReaction?.type === reaction.type ? null : reaction, index)
            }
            onMouseEnter={() => setHoveredReaction(index)}
            onMouseLeave={() => setHoveredReaction(null)}
            className="relative cursor-pointer"
            style={{
              lineHeight: 1,
              padding: '4px 5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...getEmojiStyle(index),
            }}
          >
            <img src={reaction.emoji} alt={reaction.label} draggable={false} style={{ width: 28, height: 28, flexShrink: 0 }} />

            {/* Label tooltip */}
            {hoveredReaction === index && hasEntered && (
              <span
                className="pointer-events-none absolute -top-8 left-1/2 whitespace-nowrap rounded-md bg-black px-2 py-0.5 text-[10px] font-bold text-white"
                style={{
                  transform: 'translateX(-50%)',
                  animation: 'reaction-label-in 0.18s ease-out both',
                }}
              >
                {reaction.label}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  const likeAnimStyle: React.CSSProperties = isLikeAnimating
    ? { animation: 'like-thump 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }
    : {};

  if (variant === 'reel') {
    return (
      <div
        className={`relative flex flex-col items-center gap-1.5 ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {picker}
        <button
          onClick={handleButtonClick}
          disabled={disabled}
          type="button"
          className={`flex flex-col items-center gap-1 group cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${buttonClassName}`}
          style={likeAnimStyle}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground shadow-sm border border-border/80 transition-all group-hover:bg-muted dark:group-hover:bg-muted ${ selectedReaction ? 'ring-2 ring-primary/30' : '' }`}
          >
            {selectedReaction ? (
              <img src={selectedReaction.emoji} alt={selectedReaction.label} width={22} height={22} draggable={false} />
            ) : (
              <ThumbsUp className="h-5 w-5" strokeWidth={2.25} />
            )}
          </div>
          <span className="text-[11px] font-semibold leading-none text-foreground tabular-nums">
            {formatReelCount(count)}
          </span>
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
        type="button"
        className={`flex items-center justify-center gap-2 rounded-lg transition-colors hover:bg-muted disabled:opacity-60 ${ compact ? 'px-3 py-1 text-sm' : 'w-full px-4 py-2' } ${selectedReaction ? selectedReaction.color : 'text-muted-foreground'} ${buttonClassName}`}
        style={likeAnimStyle}
      >
        {selectedReaction ? (
          <>
            <img
              src={selectedReaction.emoji}
              alt={selectedReaction.label}
              width={20} height={20}
              draggable={false}
              style={isLikeAnimating ? { animation: 'reaction-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' } : {}}
            />
            <span className="font-medium">{selectedReaction.label}</span>
          </>
        ) : (
          <>
            <ThumbsUp className="h-5 w-5" />
            <span className="font-medium">Thích</span>
          </>
        )}
      </button>
    </div>
  );
}
