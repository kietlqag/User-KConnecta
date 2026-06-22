import { useMemo } from 'react';

export type VoiceWaveformVariant = 'own' | 'other' | 'recording';

interface VoiceWaveformProps {
  barCount?: number;
  /** Bar heights 0–1. Falls back to seed-based pattern when omitted. */
  heights?: number[];
  seed?: string;
  /** Playback progress 0–100 */
  progress?: number;
  isActive?: boolean;
  variant?: VoiceWaveformVariant;
  className?: string;
}

function hashSeed(seed: string, barCount: number): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Array.from({ length: barCount }, (_, index) => {
    const mixed = Math.abs(Math.sin((hash + index * 17) * 0.73) * 10000);
    return 0.22 + (mixed % 78) / 100;
  });
}

export function VoiceWaveform({
  barCount = 28,
  heights,
  seed = 'voice',
  progress = 0,
  isActive = false,
  variant = 'own',
  className = '',
}: VoiceWaveformProps) {
  const barHeights = useMemo(() => {
    if (heights && heights.length > 0) {
      if (heights.length === barCount) return heights;
      return Array.from({ length: barCount }, (_, i) => heights[Math.floor((i / barCount) * heights.length)] ?? 0.2);
    }
    return hashSeed(seed, barCount);
  }, [barCount, heights, seed]);

  const playedRatio = Math.min(100, Math.max(0, progress)) / 100;

  return (
    <div
      className={`flex h-8 flex-1 items-center justify-center gap-[2px] overflow-hidden ${className}`}
      aria-hidden
    >
      {barHeights.map((height, index) => {
        const barRatio = (index + 1) / barCount;
        const isPlayed = barRatio <= playedRatio;
        const isLive = isActive && (!playedRatio || barRatio > playedRatio - 0.08);

        let barClass = '';
        if (variant === 'recording') {
          barClass = isLive ? 'bg-white' : 'bg-white/55';
        } else if (variant === 'own') {
          barClass = isPlayed ? 'bg-white' : isLive ? 'bg-white/75' : 'bg-white/40';
        } else {
          barClass = isPlayed ? 'bg-blue-600' : isLive ? 'bg-blue-500/70' : 'bg-gray-400/55 dark:bg-gray-500/55';
        }

        return (
          <span
            key={index}
            className={`w-[3px] shrink-0 rounded-full transition-[height,opacity] duration-150 ${barClass} ${
              isLive ? 'animate-voice-bar' : ''
            }`}
            style={{
              height: `${Math.round(6 + height * 22)}px`,
              animationDelay: isLive ? `${(index % 7) * 70}ms` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
