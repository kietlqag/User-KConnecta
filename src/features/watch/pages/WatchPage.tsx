import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  showSavedTab,
}: {
  activeTab: WatchTab;
  onTabChange: (tab: WatchTab) => void;
  searchQuery?: string | null;
  showSavedTab: boolean;
}) => {
  const { t } = useTranslation();

  return (
  <aside className="hidden lg:flex fixed top-14 left-0 z-40 h-[calc(100vh-56px)] w-[320px] flex-col gap-1 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-4">
    <h1 className="px-3 pb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('watch.title')}</h1>

    {searchQuery ? (
      <div className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2.5 text-gray-900 dark:text-white">
        <Search className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="min-w-0">
          <span className="block text-[15px] font-semibold">{t('watch.searchResults')}</span>
          <span className="block truncate text-xs text-gray-500 dark:text-gray-400">&quot;{searchQuery}&quot;</span>
        </div>
      </div>
    ) : (
      <nav className="flex flex-col gap-1" aria-label={t('watch.navAria')}>
        <button
          type="button"
          onClick={() => onTabChange('forYou')}
          className={sidebarTabClass(activeTab === 'forYou')}
        >
          <Star className="h-6 w-6 shrink-0" />
          <span className="text-[15px] font-semibold">{t('watch.forYou')}</span>
        </button>
        {showSavedTab && (
          <button
            type="button"
            onClick={() => onTabChange('saved')}
            className={sidebarTabClass(activeTab === 'saved')}
          >
            <Bookmark className="h-6 w-6 shrink-0" />
            <span className="text-[15px] font-semibold">{t('watch.saved')}</span>
          </button>
        )}
      </nav>
    )}
  </aside>
  );
};

export const WatchPage = () => {
  const { t } = useTranslation();
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

  const savedWatch = useSavedWatchReels(currentUser?.id ?? undefined, !!currentUser?.id);
  const showSavedTab = Boolean(currentUser?.id);
  const isSavedWatchMode = !isSearchWatchMode && watchTab === 'saved' && showSavedTab;

  const handleWatchTabChange = (tab: WatchTab) => {
    if (tab === 'saved' && !showSavedTab) return;
    setWatchTab(tab);
    setCurrentReelIndex(0);
  };

  useEffect(() => {
    if (!showSavedTab && watchTab === 'saved') {
      setWatchTab('forYou');
      setCurrentReelIndex(0);
    }
  }, [showSavedTab, watchTab]);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

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

  const handlePreviousRef = useRef(handlePrevious);
  const handleNextRef = useRef(handleNext);
  handlePreviousRef.current = handlePrevious;
  handleNextRef.current = handleNext;

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

      e.preventDefault();
      e.stopPropagation();
      cooldown = true;
      if (e.deltaY > 0) {
        handleNextRef.current();
      } else {
        handlePreviousRef.current();
      }
      window.setTimeout(() => {
        cooldown = false;
      }, 450);
    };

    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', handleWheel, { capture: true });
  }, []);

  const loadingMessage = useMemo(() => {
    if (!currentUser?.id) return t('watch.loginRequired');
    if (isLoading) return t('watch.loading');
    if (isFetchingNextPage && reels.length === 0) return t('watch.loading');
    return null;
  }, [currentUser?.id, isLoading, isFetchingNextPage, reels.length, t]);

  return (
    <div className="h-screen bg-white dark:bg-gray-800 overflow-hidden">
      <Header />
      <WatchSidebar
        activeTab={watchTab}
        onTabChange={handleWatchTabChange}
        searchQuery={isSearchWatchMode ? searchQuery : null}
        showSavedTab={showSavedTab}
      />

      {!isSearchWatchMode && showSavedTab && (
        <nav
          className="lg:hidden fixed top-14 left-0 right-0 z-40 flex border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
          aria-label={t('watch.navAria')}
        >
          <button
            type="button"
            onClick={() => handleWatchTabChange('forYou')}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
              watchTab === 'forYou'
                ? 'border-b-2 border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Star className="h-4 w-4" />
            {t('watch.forYou')}
          </button>
          <button
            type="button"
            onClick={() => handleWatchTabChange('saved')}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
              watchTab === 'saved'
                ? 'border-b-2 border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Bookmark className="h-4 w-4" />
            {t('watch.saved')}
          </button>
        </nav>
      )}

      <div className={`mt-14 h-[calc(100vh-56px)] relative overflow-hidden overscroll-none lg:pl-[320px] ${showSavedTab && !isSearchWatchMode ? 'pt-12 lg:pt-0' : ''}`}>
        {loadingMessage ? (
          <div className="flex h-full items-center justify-center text-gray-700 dark:text-gray-300">{loadingMessage}</div>
        ) : isError ? (
          <div className="flex h-full items-center justify-center text-gray-700 dark:text-gray-300">
            {t('watch.loadError')}
          </div>
        ) : reels.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-700 dark:text-gray-300">
            {isSearchWatchMode
              ? t('watch.emptySearch')
              : isSavedWatchMode
                ? t('watch.emptySaved')
                : t('watch.empty')}
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
    </div>
  );
};
