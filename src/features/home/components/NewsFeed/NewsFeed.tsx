import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Newspaper } from 'lucide-react';
import { Stories } from '../Stories';
import { CreatePost } from '../CreatePost';
import { Post } from '../../../../components/shared';
import { FriendSuggestions } from '../FriendSuggestions';
import { FeedErrorState } from './FeedErrorState';
import { AUTH_USER_CHANGED_EVENT, authService } from '@/services/authService';
import { type PaginatedResponse, type PostResponse } from '@/services/postService';
import { mapApiPost } from '@/utils/postUtils';
import { getSeenPostIds, markPostsSeen } from '@/utils/seenPosts';
import { POSTS_FEED_KEY, useHighlightedPost, usePostsFeed } from '../../hooks/usePosts';

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
  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (document.visibilityState === 'visible') {
        if (hiddenAt != null && Date.now() - hiddenAt >= AWAY_RELOAD_MS) {
          void queryClient.resetQueries({ queryKey: POSTS_FEED_KEY });
          window.scrollTo({ top: 0, left: 0 });
        }
        hiddenAt = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [queryClient]);

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

  // Scroll to and highlight the target post after the feed finishes loading
  useEffect(() => {
    if (isLoading || !highlightedPostId || posts.length === 0) return;
    const timer = setTimeout(() => {
      const element = document.getElementById(`post-${highlightedPostId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-blue-500', 'ring-opacity-50', 'transition-all', 'duration-1000');
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50');
        }, 3000);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [isLoading, highlightedPostId, posts]);

  // Remove a post from the cache without triggering a refetch
  const handleDelete = useCallback(
    (postId: string) => {
      queryClient.setQueryData<InfiniteData<PaginatedResponse<PostResponse>>>(
        [...POSTS_FEED_KEY, currentUser?.id],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              content: page.content.filter((p) => p.id !== postId),
            })),
          };
        }
      );
    },
    [queryClient, currentUser?.id]
  );

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
          onRetry={() => void refetch()}
          isRetrying={isRefetching}
          detail={getFeedErrorDetail(error)}
        />
      )}

      {posts.map((post, index) => (
        <React.Fragment key={post.id}>
          <Post {...post} onDelete={handleDelete} />
          {index === 2 && <FriendSuggestions />}
        </React.Fragment>
      ))}

      {/* Sentinel: IntersectionObserver watches this to trigger fetchNextPage */}
      <div ref={sentinelRef} />

      {isFetchingNextPage && (
        <div className="p-4 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Đang tải thêm...</span>
        </div>
      )}

      {!isLoading && !error && !hasNextPage && posts.length > 0 && (
        <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
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
