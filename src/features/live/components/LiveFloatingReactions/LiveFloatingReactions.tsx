import { useCallback, useEffect, useState } from 'react';

const REACTION_EMOJI: Record<string, string> = {
  LIKE: '👍',
  LOVE: '❤️',
  HAHA: '😆',
  WOW: '😮',
  SAD: '😢',
  ANGRY: '😡',
};

type FloatingReaction = {
  id: string;
  emoji: string;
  left: number;
};

interface LiveFloatingReactionsProps {
  bursts: Array<{ id: string; reactionType: string }>;
}

export function getLiveReactionEmoji(reactionType?: string | null) {
  if (!reactionType) return '👍';
  return REACTION_EMOJI[reactionType] ?? '👍';
}

export function LiveFloatingReactions({ bursts }: LiveFloatingReactionsProps) {
  const [items, setItems] = useState<FloatingReaction[]>([]);

  useEffect(() => {
    if (bursts.length === 0) return;
    const latest = bursts[bursts.length - 1];
    const emoji = getLiveReactionEmoji(latest.reactionType);
    const next: FloatingReaction = {
      id: latest.id,
      emoji,
      left: 12 + Math.random() * 76,
    };
    setItems((prev) => [...prev, next]);
    const timer = window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== next.id));
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [bursts]);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 h-40 overflow-hidden">
      {items.map((item) => (
        <span
          key={item.id}
          className="float-emoji absolute bottom-0 text-4xl drop-shadow-lg"
          style={{ left: `${item.left}%` }}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  );
}

export function useLiveReactionBursts() {
  const [bursts, setBursts] = useState<Array<{ id: string; reactionType: string }>>([]);

  const pushBurst = useCallback((reactionType: string | null | undefined) => {
    if (!reactionType) return;
    setBursts((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, reactionType }]);
  }, []);

  return { bursts, pushBurst };
}
