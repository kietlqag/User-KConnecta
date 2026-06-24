import {
  forwardRef,
  useCallback,
  useImperativeHandle,
} from 'react';
import type { Reel } from '../../types/watch.types';
import { ReelPlayer } from '../ReelPlayer';

export interface ReelSlideViewportHandle {
  goNext: () => void;
  goPrevious: () => void;
}

interface ReelSlideViewportProps {
  reels: Reel[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  hasNextPage?: boolean;
}

export const ReelSlideViewport = forwardRef<ReelSlideViewportHandle, ReelSlideViewportProps>(
  function ReelSlideViewport({ reels, currentIndex, onIndexChange, hasNextPage = false }, ref) {
    const safeIndex = Math.min(Math.max(currentIndex, 0), Math.max(reels.length - 1, 0));
    const reel = reels[safeIndex];

    const goNext = useCallback(() => {
      if (safeIndex < reels.length - 1) {
        onIndexChange(safeIndex + 1);
      }
    }, [onIndexChange, reels.length, safeIndex]);

    const goPrevious = useCallback(() => {
      if (safeIndex > 0) {
        onIndexChange(safeIndex - 1);
      }
    }, [onIndexChange, safeIndex]);

    useImperativeHandle(ref, () => ({ goNext, goPrevious }), [goNext, goPrevious]);

    if (!reel) return null;

    return (
      <div className="relative h-full w-full overflow-hidden overscroll-none [contain:strict]">
        <ReelPlayer
          key={reel.id}
          reel={reel}
          isActive
          onPrevious={goPrevious}
          onNext={goNext}
          hasPrevious={safeIndex > 0}
          hasNext={safeIndex < reels.length - 1 || hasNextPage}
        />
      </div>
    );
  },
);
