import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  ReelSlideViewport,
  type ReelSlideViewportHandle,
} from '@/features/watch/components';
import type { Reel } from '@/features/watch/types/watch.types';

function isWatchOverlayTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return Boolean(
    el.closest('[data-reel-comments]')
      || el.closest('[data-share-modal]')
      || el.closest('[data-slot="dialog-content"]'),
  );
}

interface SearchReelModalProps {
  open: boolean;
  reels: Reel[];
  initialIndex: number;
  onClose: () => void;
}

export function SearchReelModal({ open, reels, initialIndex, onClose }: SearchReelModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const viewportRef = useRef<ReelSlideViewportHandle>(null);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handlePrevious = useCallback(() => {
    viewportRef.current?.goPrevious();
  }, []);

  const handleNext = useCallback(() => {
    viewportRef.current?.goNext();
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (isWatchOverlayTarget(e.target)) return;
      if (e.key === 'ArrowUp') {
        handlePrevious();
      } else if (e.key === 'ArrowDown') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, handlePrevious, handleNext]);

  useEffect(() => {
    if (!open) return;

    let cooldown = false;

    const handleWheel = (e: WheelEvent) => {
      if (isWatchOverlayTarget(e.target)) return;
      if (cooldown || Math.abs(e.deltaY) < 10) return;

      e.preventDefault();
      cooldown = true;
      if (e.deltaY > 0) {
        handleNext();
      } else {
        handlePrevious();
      }
      window.setTimeout(() => {
        cooldown = false;
      }, 600);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [open, handlePrevious, handleNext]);

  if (!open || reels.length === 0) return null;

  const currentReel = reels[currentIndex];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Xem thước phim"
    >
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <p className="text-sm font-medium text-white/80">
          {currentIndex + 1} / {reels.length}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-white transition-colors hover:bg-white/10"
          aria-label="Đóng"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {currentReel ? (
          <ReelSlideViewport
            ref={viewportRef}
            reels={reels}
            currentIndex={currentIndex}
            onIndexChange={setCurrentIndex}
          />
        ) : null}
      </div>

      <div className="pointer-events-none absolute left-0 right-0 top-0 h-1 bg-white/10">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / reels.length) * 100}%` }}
        />
      </div>
    </div>,
    document.body,
  );
}
