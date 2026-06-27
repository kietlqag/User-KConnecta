import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Stories } from '../Stories';
import { CreatePost } from '../CreatePost';
import { Post } from '../../../../components/shared';
import { FriendSuggestions } from '../FriendSuggestions';
import { FeedErrorState } from './FeedErrorState';
import { AUTH_USER_CHANGED_EVENT, authService } from '@/services/authService';
import { type PaginatedResponse, type PostResponse } from '@/services/postService';
import { mapApiPost } from '@/utils/postUtils';
import { getSeenPostIds, markPostsSeen } from '@/utils/seenPosts';
import { POSTS_FEED_KEY, HOME_FEED_REFRESH_EVENT, useHighlightedPost, usePostsFeed } from '../../hooks/usePosts';
import { scrollToHomeTop } from '../../utils/scrollToHomeTop';

// Khi rời tab ≥ ngưỡng này rồi quay lại → reload feed tươi mới (về đầu).
const AWAY_RELOAD_MS = 60_000;

function getFeedErrorDetail(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error && error.message.trim()) return error.message;
  return null;
}

export function NewsFeed() {
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const highlightedPostId = searchParams.get('post');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasNextPageRef = useRef(false);
  const isFetchingNextPageRef = useRef(false);
  // Snapshot of seen post IDs at mount — used to surface new posts above already-seen ones on refresh
  const seenAtMount = useRef(getSeenPostIds());
  const fetchNextPageRef = useRef<() => void>(() => {});
  const [feedScrollAnim, setFeedScrollAnim] = useState(false);
  const feedAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerFeedScrollAnim = useCallback(() => {
    if (feedAnimTimerRef.current) clearTimeout(feedAnimTimerRef.current);
    setFeedScrollAnim(true);
    feedAnimTimerRef.current = setTimeout(() => setFeedScrollAnim(false), 760);
  }, []);

  useEffect(() => {
    return () => {
      if (feedAnimTimerRef.current) clearTimeout(feedAnimTimerRef.current);
    };
  }, []);

  // Synchronize currentUser and invalidate feed on auth change
  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(authService.getCurrentUser());
      void queryClient.invalidateQueries({ queryKey: POSTS_FEED_KEY });
    };
    window.addEventListener(AUTH_USER_CHANGED_EVENT, handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener(AUTH_USER_CHANGED_EVENT, handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [queryClient]);

  // Reload the feed fresh (reset to page 0 + scroll to top) when returning to the
  // tab after being away ≥ AWAY_RELOAD_MS. Short tab switches keep scroll/state.
  const reloadFeedFresh = useCallback(() => {
    seenAtMount.current = getSeenPostIds();
    triggerFeedScrollAnim();
    void scrollToHomeTop().then(() => {
      void queryClient.resetQueries({ queryKey: POSTS_FEED_KEY });
    });
  }, [queryClient, triggerFeedScrollAnim]);

  useEffect(() => {
    const onHomeRefresh = () => {
      seenAtMount.current = getSeenPostIds();
      triggerFeedScrollAnim();
    };
    window.addEventListener(HOME_FEED_REFRESH_EVENT, onHomeRefresh);
    return () => window.removeEventListener(HOME_FEED_REFRESH_EVENT, onHomeRefresh);
  }, [triggerFeedScrollAnim]);

  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (document.visibilityState === 'visible') {
        if (hiddenAt != null && Date.now() - hiddenAt >= AWAY_RELOAD_MS) {
          reloadFeedFresh();
        }
        hiddenAt = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [reloadFeedFresh]);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, error, refetch, isRefetching } =
    usePostsFeed(currentUser?.id);

  // Keep refs in sync every render so the observer callback always reads fresh values
  hasNextPageRef.current = hasNextPage ?? false;
  isFetchingNextPageRef.current = isFetchingNextPage;
  fetchNextPageRef.current = fetchNextPage;

  // Determine whether the highlighted post is already present in the loaded pages
  const feedPostIds = useMemo(
    () => new Set(data?.pages.flatMap((p) => p.content.map((c) => c.id)) ?? []),
    [data]
  );

  // Only fetch the highlighted post separately when it isn't in the feed yet
  const { data: highlightedPostData } = useHighlightedPost(
    highlightedPostId && !feedPostIds.has(highlightedPostId) ? highlightedPostId : null,
    currentUser?.id
  );

  // Flatten all pages: on the first page, surface unseen posts above seen ones so
  // returning users see fresh content first. Subsequent pages append in score order.
  const posts = useMemo(() => {
    if (!data) return [];
    const flattened = data.pages.flatMap((page, pageIndex) => {
      const pagePosts = page.content.map(mapApiPost);
      if (pageIndex === 0 && seenAtMount.current.size > 0) {
        const unseen = pagePosts.filter((p) => !seenAtMount.current.has(p.id));
        const seen = pagePosts.filter((p) => seenAtMount.current.has(p.id));
        return [...unseen, ...seen];
      }
      return pagePosts;
    });

    // The home feed ranks by a NOW()-based score with offset pagination, so pages
    // can overlap and surface the same post twice. Dedupe by id (keep first) to
    // avoid duplicate React keys, which remount the list and reset scroll on load-more.
    const seenIds = new Set<string>();
    const allPosts = flattened.filter((p) => {
      if (seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    });

    if (!highlightedPostId) return allPosts;

    const withoutHighlight = allPosts.filter((p) => p.id !== highlightedPostId);
    const highlight =
      allPosts.find((p) => p.id === highlightedPostId) ??
      (highlightedPostData ? mapApiPost(highlightedPostData) : null);
    return highlight ? [highlight, ...withoutHighlight] : withoutHighlight;
  }, [data, highlightedPostId, highlightedPostData]);

  // Mark rendered posts as seen so next session surfaces newer content first
  useEffect(() => {
    if (posts.length > 0) {
      markPostsSeen(posts.map((p) => p.id));
    }
  }, [posts]);

  // Re-attach observer when feed grows so we fetch the next page if sentinel is already visible
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || isLoading || !hasNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPageRef.current && !isFetchingNextPageRef.current) {
          void fetchNextPageRef.current();
        }
      },
      { rootMargin: '0px 0px 400px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoading, hasNextPage, posts.length]);

  const scrolledHighlightRef = useRef<string | null>(null);

  useEffect(() => {
    scrolledHighlightRef.current = null;
  }, [highlightedPostId]);

  // Scroll to and highlight the target post once after the feed finishes loading
  useEffect(() => {
    if (isLoading || !highlightedPostId || posts.length === 0) return;
    if (scrolledHighlightRef.current === highlightedPostId) return;

    const timer = setTimeout(() => {
      const element = document.getElementById(`post-${highlightedPostId}`);
      if (!element) return;
      scrolledHighlightRef.current = highlightedPostId;
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-4', 'ring-emerald-500', 'ring-opacity-50', 'transition-all', 'duration-1000');
      setTimeout(() => {
        element.classList.remove('ring-4', 'ring-emerald-500', 'ring-opacity-50');
      }, 3000);
    }, 500);
    return () => clearTimeout(timer);
  }, [isLoading, highlightedPostId, posts.length]);

  return (
    <div className="space-y-0">
      <Stories />
      <CreatePost />

      {isLoading && (
        <div className="rounded-xl bg-card p-6 text-center text-sm text-muted-foreground shadow-sm border border-border">
          Đang tải bảng tin...
        </div>
      )}

      {!isLoading && error && (
        <FeedErrorState
          onRetry={() => {
            triggerFeedScrollAnim();
            void scrollToHomeTop().then(() => {
              void refetch();
            });
          }}
          isRetrying={isRefetching}
          detail={getFeedErrorDetail(error)}
        />
      )}

      <div
        className={cn(
          'space-y-0 transition-[opacity,transform] duration-[720ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none motion-reduce:transform-none',
          feedScrollAnim && 'pointer-events-none opacity-80 -translate-y-3',
        )}
      >
      {posts.map((post, index) => (
        <React.Fragment key={post.id}>
          <Post {...post} />
          {index === 2 && <FriendSuggestions />}
        </React.Fragment>
      ))}
      </div>

      {/* Sentinel: IntersectionObserver watches this to trigger fetchNextPage */}
      <div ref={sentinelRef} />

      {isFetchingNextPage && (
        <div className="p-4 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-emerald-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <span className="ml-2 text-sm text-muted-foreground">Đang tải thêm...</span>
        </div>
      )}

      {!isLoading && !error && !hasNextPage && posts.length > 0 && (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Bạn đã xem hết tất cả bài viết.
        </div>
      )}

      {!isLoading && !error && posts.length === 0 && (
        <div className="rounded-xl border border-border bg-card px-6 py-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Newspaper className="h-7 w-7 text-muted-foreground" aria-hidden />
          </div>
          <h2 className="text-base font-semibold text-foreground">Chưa có bài viết</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Hãy theo dõi bạn bè hoặc đăng bài đầu tiên để bảng tin bắt đầu có nội dung.
          </p>
        </div>
      )}
    </div>
  );
}
