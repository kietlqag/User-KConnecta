import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Stories } from '../Stories';
import { CreatePost } from '../CreatePost';
import { Post } from '../../../../components/shared';
import { FriendSuggestions } from '../FriendSuggestions';
import { AUTH_USER_CHANGED_EVENT, authService } from '@/services/authService';
import { type PaginatedResponse, type PostResponse } from '@/services/postService';
import { mapApiPost } from '@/utils/postUtils';
import { POSTS_FEED_KEY, useHighlightedPost, usePostsFeed } from '../../hooks/usePosts';

export function NewsFeed() {
  const currentUser = authService.getCurrentUser();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const highlightedPostId = searchParams.get('post');
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Re-fetch feed when the logged-in user changes
  useEffect(() => {
    const bump = () => queryClient.invalidateQueries({ queryKey: POSTS_FEED_KEY });
    window.addEventListener(AUTH_USER_CHANGED_EVENT, bump);
    return () => window.removeEventListener(AUTH_USER_CHANGED_EVENT, bump);
  }, [queryClient]);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, error } =
    usePostsFeed(currentUser?.id);

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

  // Flatten all pages and move/prepend the highlighted post to the top
  const posts = useMemo(() => {
    const flat = data?.pages.flatMap((p) => p.content.map(mapApiPost)) ?? [];
    if (!highlightedPostId) return flat;

    const withoutHighlight = flat.filter((p) => p.id !== highlightedPostId);
    const highlight =
      flat.find((p) => p.id === highlightedPostId) ??
      (highlightedPostData ? mapApiPost(highlightedPostData) : null);
    return highlight ? [highlight, ...withoutHighlight] : withoutHighlight;
  }, [data, highlightedPostId, highlightedPostData]);

  // Sentinel-based infinite scroll: fetch next page when the bottom div enters the viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
        <div className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">
          Đang tải bảng tin...
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-lg bg-white p-6 text-center text-sm text-red-500 shadow">
          Không thể tải bảng tin
        </div>
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
          <span className="ml-2 text-sm text-gray-500">Đang tải thêm...</span>
        </div>
      )}

      {!isLoading && !error && !hasNextPage && posts.length > 0 && (
        <div className="p-8 text-center text-sm text-gray-500">
          Bạn đã xem hết tất cả bài viết.
        </div>
      )}

      {!isLoading && !error && posts.length === 0 && (
        <div className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">
          Chưa có bài viết trong bảng tin.
        </div>
      )}
    </div>
  );
}
