import { useState, useRef, useEffect } from 'react';
import { ThumbsUp } from 'lucide-react';

interface Reaction {
  emoji: string;
  label: string;
  color: string;
}

const reactions: Reaction[] = [
  { emoji: '👍', label: 'Like', color: 'text-blue-500' },
  { emoji: '❤️', label: 'Love', color: 'text-red-500' },
  { emoji: '😂', label: 'Haha', color: 'text-yellow-500' },
  { emoji: '😮', label: 'Wow', color: 'text-yellow-500' },
  { emoji: '😢', label: 'Sad', color: 'text-yellow-500' },
  { emoji: '😡', label: 'Angry', color: 'text-orange-500' },
];

interface ReactionButtonProps {
  initialReaction?: Reaction | null;
  onReactionChange?: (reaction: Reaction | null) => void;
}

export function ReactionButton({ initialReaction = null, onReactionChange }: ReactionButtonProps) {
  const [selectedReaction, setSelectedReaction] = useState<Reaction | null>(initialReaction);
  const [showReactions, setShowReactions] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
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

  const handleReactionClick = (reaction: Reaction) => {
    if (selectedReaction?.emoji === reaction.emoji) {
      setSelectedReaction(null);
      onReactionChange?.(null);
    } else {
      setSelectedReaction(reaction);
      onReactionChange?.(reaction);
    }
    setShowReactions(false);
  };

  const handleButtonClick = () => {
    if (!selectedReaction) {
      const likeReaction = reactions[0];
      setSelectedReaction(likeReaction);
      onReactionChange?.(likeReaction);
    } else {
      setSelectedReaction(null);
      onReactionChange?.(null);
    }
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
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Reaction Bar */}
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
              key={reaction.label}
              onClick={() => handleReactionClick(reaction)}
              onMouseEnter={() => setHoveredReaction(index)}
              onMouseLeave={() => setHoveredReaction(null)}
              className={`text-2xl transition-all duration-150 ease-out hover:scale-125 ${
                hoveredReaction === index ? 'scale-125 -translate-y-1' : 'scale-100'
              }`}
              style={{ padding: '4px' }}
              aria-label={reaction.label}
            >
              {reaction.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Like Button */}
      <button
        onClick={handleButtonClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors ${
          selectedReaction ? selectedReaction.color : 'text-gray-600'
        }`}
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
