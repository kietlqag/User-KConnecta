import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { Reel } from '../../types/watch.types';
import { ReelPlayer } from '../ReelPlayer';

const SLIDE_DURATION_MS = 380;

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
    const [displayIndex, setDisplayIndex] = useState(currentIndex);
    const [incomingIndex, setIncomingIndex] = useState<number | null>(null);
    const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const transitionLockRef = useRef(false);

    useEffect(() => {
      if (!transitionLockRef.current && currentIndex !== displayIndex && incomingIndex === null) {
        setDisplayIndex(currentIndex);
      }
    }, [currentIndex, displayIndex, incomingIndex]);

    const finishTransition = useCallback(
      (nextIndex: number) => {
        setDisplayIndex(nextIndex);
        setIncomingIndex(null);
        setDirection(null);
        setIsAnimating(false);
        transitionLockRef.current = false;
        onIndexChange(nextIndex);
      },
      [onIndexChange],
    );

    const startTransition = useCallback(
      (nextIndex: number, slideDirection: 'next' | 'prev') => {
        if (transitionLockRef.current || nextIndex === displayIndex) return;
        if (nextIndex < 0 || nextIndex >= reels.length) return;

        transitionLockRef.current = true;
        setIncomingIndex(nextIndex);
        setDirection(slideDirection);
        setIsAnimating(false);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => setIsAnimating(true));
        });

        window.setTimeout(() => finishTransition(nextIndex), SLIDE_DURATION_MS);
      },
      [displayIndex, finishTransition, reels.length],
    );

    const goNext = useCallback(() => {
      if (displayIndex < reels.length - 1) {
        startTransition(displayIndex + 1, 'next');
      }
    }, [displayIndex, reels.length, startTransition]);

    const goPrevious = useCallback(() => {
      if (displayIndex > 0) {
        startTransition(displayIndex - 1, 'prev');
      }
    }, [displayIndex, startTransition]);

    useImperativeHandle(ref, () => ({ goNext, goPrevious }), [goNext, goPrevious]);

    const outgoingReel = reels[displayIndex];
    const incomingReel = incomingIndex !== null ? reels[incomingIndex] : null;

    if (!outgoingReel) return null;

    const outgoingTransform =
      isAnimating && direction === 'next'
        ? '-translate-y-full'
        : isAnimating && direction === 'prev'
          ? 'translate-y-full'
          : 'translate-y-0';

    const incomingTransform =
      direction === 'next'
        ? isAnimating
          ? 'translate-y-0'
          : 'translate-y-full'
        : isAnimating
          ? 'translate-y-0'
          : '-translate-y-full';

    return (
      <div className="relative h-full w-full overflow-hidden">
        <div
          className={`absolute inset-0 transition-transform duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${outgoingTransform}`}
        >
          <ReelPlayer
            reel={outgoingReel}
            isActive={!isAnimating}
            onPrevious={goPrevious}
            onNext={goNext}
            hasPrevious={displayIndex > 0}
            hasNext={displayIndex < reels.length - 1 || hasNextPage}
          />
        </div>

        {incomingReel && direction && (
          <div
            className={`absolute inset-0 transition-transform duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${incomingTransform}`}
          >
            <ReelPlayer
              reel={incomingReel}
              isActive={isAnimating}
              onPrevious={goPrevious}
              onNext={goNext}
              hasPrevious={incomingIndex! > 0}
              hasNext={incomingIndex! < reels.length - 1 || hasNextPage}
            />
          </div>
        )}
      </div>
    );
  },
);
