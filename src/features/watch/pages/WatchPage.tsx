import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Star, Bookmark } from 'lucide-react';
import { Header } from '../../home/components/Header';
import { ReelSlideViewport, type ReelSlideViewportHandle } from '../components';
import { AUTH_USER_CHANGED_EVENT, authService } from '@/services/authService';
import { WATCH_FEED_KEY, useWatchFeed } from '../hooks/useWatchFeed';
import { useSearchWatchReels } from '../hooks/useSearchWatchReels';
import { useSavedWatchReels } from '../hooks/useSavedWatchReels';

type WatchTab = 'forYou' | 'saved';

function isWatchOverlayTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return Boolean(
    el.closest('[data-reel-comments]')
      || el.closest('[data-share-modal]')
      || el.closest('[data-slot="dialog-content"]'),
  );
}

const sidebarTabClass = (active: boolean) =>
  `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
    active
      ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
  }`;

const WatchSidebar = ({
  activeTab,
  onTabChange,
  searchQuery,
}: {
  activeTab: WatchTab;
  onTabChange: (tab: WatchTab) => void;
  searchQuery?: string | null;
}) => (
  <aside className="hidden lg:flex fixed top-14 left-0 z-40 h-[calc(100vh-56px)] w-[320px] flex-col gap-1 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-4">
    <h1 className="px-3 pb-3 text-2xl font-bold text-gray-900 dark:text-white">Watch</h1>

    {searchQuery ? (
      <div className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2.5 text-gray-900 dark:text-white">
        <Search className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="min-w-0">
          <span className="block text-[15px] font-semibold">Kết quả tìm kiếm</span>
          <span className="block truncate text-xs text-gray-500 dark:text-gray-400">&quot;{searchQuery}&quot;</span>
        </div>
      </div>
    ) : (
      <nav className="flex flex-col gap-1" aria-label="Watch navigation">
        <button
          type="button"
          onClick={() => onTabChange('forYou')}
          className={sidebarTabClass(activeTab === 'forYou')}
        >
          <Star className="h-6 w-6 shrink-0" />
          <span className="text-[15px] font-semibold">Dành cho bạn</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange('saved')}
          className={sidebarTabClass(activeTab === 'saved')}
        >
          <Bookmark className="h-6 w-6 shrink-0" />
          <span className="text-[15px] font-semibold">Đã lưu</span>
        </button>
      </nav>
    )}
  </aside>
);

export const WatchPage = () => {
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [watchTab, setWatchTab] = useState<WatchTab>('forYou');
  const viewportRef = useRef<ReelSlideViewportHandle>(null);
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const reelId = searchParams.get('id');
  const fromSearch = searchParams.get('from') === 'search';
  const searchQuery = searchParams.get('q');
  const playlistIds = useMemo(() => {
    const raw = searchParams.get('playlist');
    if (!raw) return null;
    const ids = raw.split(',').map((id) => id.trim()).filter(Boolean);
    return ids.length > 0 ? ids : null;
  }, [searchParams]);
  const isSearchWatchMode = fromSearch && !!searchQuery?.trim() && !!playlistIds?.length;
  const isSavedWatchMode = !isSearchWatchMode && watchTab === 'saved';

  const handleWatchTabChange = (tab: WatchTab) => {
    setWatchTab(tab);
    setCurrentReelIndex(0);
  };

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

  const watchFeed = useWatchFeed(currentUser?.id ?? undefined);
  const searchWatch = useSearchWatchReels(searchQuery, playlistIds, isSearchWatchMode);
  const savedWatch = useSavedWatchReels(currentUser?.id ?? undefined, isSavedWatchMode);

  const {
    data: reels = [],
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = isSearchWatchMode ? searchWatch : isSavedWatchMode ? savedWatch : watchFeed;

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
    if (isSearchWatchMode || isSavedWatchMode || reels.length === 0) return;
    if (currentReelIndex < reels.length - 2) return;
    if (!hasNextPageRef.current || isFetchingNextPageRef.current) return;
    void fetchNextPageRef.current();
  }, [currentReelIndex, reels.length, isSearchWatchMode, isSavedWatchMode]);

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
      <WatchSidebar
        activeTab={watchTab}
        onTabChange={handleWatchTabChange}
        searchQuery={isSearchWatchMode ? searchQuery : null}
      />

      <div className="mt-14 h-[calc(100vh-56px)] relative lg:pl-[320px]">
        {loadingMessage ? (
          <div className="flex h-full items-center justify-center text-gray-700 dark:text-gray-300">{loadingMessage}</div>
        ) : isError ? (
          <div className="flex h-full items-center justify-center text-gray-700 dark:text-gray-300">
            Không thể tải video. Vui lòng thử lại sau.
          </div>
        ) : reels.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-700 dark:text-gray-300">
            {isSearchWatchMode
              ? 'Không có thước phim nào trong kết quả tìm kiếm.'
              : isSavedWatchMode
                ? 'Chưa có thước phim đã lưu.'
                : 'Chưa có video nào.'}
          </div>
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
