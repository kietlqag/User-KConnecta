import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { Header } from '../../home/components/Header';
import { ReelSlideViewport, type ReelSlideViewportHandle } from '../components';
import { AUTH_USER_CHANGED_EVENT, authService } from '@/services/authService';
import { WATCH_FEED_KEY, useWatchFeed } from '../hooks/useWatchFeed';

function isWatchOverlayTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return Boolean(
    el.closest('[data-reel-comments]')
      || el.closest('[data-share-modal]')
      || el.closest('[data-slot="dialog-content"]'),
  );
}

const WatchSidebar = () => (
  <aside className="hidden lg:flex fixed top-14 left-0 z-40 h-[calc(100vh-56px)] w-[320px] flex-col gap-1 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-4">
    <h1 className="px-3 pb-3 text-2xl font-bold text-gray-900 dark:text-white">Watch</h1>

    <div className="flex items-center gap-3 rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2.5 text-gray-900 dark:text-white">
      <Star className="h-6 w-6 shrink-0" />
      <span className="text-[15px] font-semibold">Dành cho bạn</span>
    </div>
  </aside>
);

export const WatchPage = () => {
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const viewportRef = useRef<ReelSlideViewportHandle>(null);
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const reelId = searchParams.get('id');

  useEffect(() => {
    const syncAuth = () => {
      setCurrentUser(authService.getCurrentUser());
      void queryClient.invalidateQueries({ queryKey: WATCH_FEED_KEY });
    };
    window.addEventListener(AUTH_USER_CHANGED_EVENT, syncAuth);
    window.addEventListener('storage', syncAuth);
    return () => {
      window.removeEventListener(AUTH_USER_CHANGED_EVENT, syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, [queryClient]);

  const {
    data: reels = [],
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useWatchFeed(currentUser?.id ?? undefined);

  const hasNextPageRef = useRef(hasNextPage);
  const isFetchingNextPageRef = useRef(isFetchingNextPage);
  const fetchNextPageRef = useRef(fetchNextPage);
  hasNextPageRef.current = hasNextPage;
  isFetchingNextPageRef.current = isFetchingNextPage;
  fetchNextPageRef.current = fetchNextPage;

  useEffect(() => {
    if (!reelId || reels.length === 0) return;
    const index = reels.findIndex((r) => r.id === reelId);
    if (index !== -1) setCurrentReelIndex(index);
  }, [reelId, reels]);

  const currentReel = reels[currentReelIndex];

  const handlePrevious = () => {
    viewportRef.current?.goPrevious();
  };

  const handleNext = () => {
    viewportRef.current?.goNext();
  };

  useEffect(() => {
    if (reels.length === 0) return;
    if (currentReelIndex < reels.length - 2) return;
    if (!hasNextPageRef.current || isFetchingNextPageRef.current) return;
    void fetchNextPageRef.current();
  }, [currentReelIndex, reels.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isWatchOverlayTarget(e.target)) return;
      if (e.key === 'ArrowUp') {
        handlePrevious();
      } else if (e.key === 'ArrowDown') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentReelIndex, reels.length]);

  useEffect(() => {
    let cooldown = false;

    const handleWheel = (e: WheelEvent) => {
      if (isWatchOverlayTarget(e.target)) return;
      if (cooldown || Math.abs(e.deltaY) < 10) return;

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

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [currentReelIndex, reels.length]);

  const loadingMessage = useMemo(() => {
    if (!currentUser?.id) return 'Vui lòng đăng nhập để xem video.';
    if (isLoading) return 'Đang tải video...';
    if (isFetchingNextPage && reels.length === 0) return 'Đang tải video...';
    return null;
  }, [currentUser?.id, isLoading, isFetchingNextPage, reels.length]);

  return (
    <div className="h-screen bg-white dark:bg-gray-800 overflow-hidden">
      <Header />
      <WatchSidebar />

      <div className="mt-14 h-[calc(100vh-56px)] relative lg:pl-[320px]">
        {loadingMessage ? (
          <div className="flex h-full items-center justify-center text-gray-700 dark:text-gray-300">{loadingMessage}</div>
        ) : isError ? (
          <div className="flex h-full items-center justify-center text-gray-700 dark:text-gray-300">
            Không thể tải video. Vui lòng thử lại sau.
          </div>
        ) : reels.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-700 dark:text-gray-300">Chưa có video nào.</div>
        ) : currentReel ? (
          <ReelSlideViewport
            ref={viewportRef}
            reels={reels}
            currentIndex={currentReelIndex}
            onIndexChange={setCurrentReelIndex}
            hasNextPage={!!hasNextPage}
          />
        ) : null}
      </div>

      {!isLoading && reels.length > 0 && (
        <div className="fixed top-14 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 z-50">
          <div
            className="h-full bg-emerald-600 transition-all duration-300"
            style={{
              width: `${((currentReelIndex + 1) / reels.length) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
};
