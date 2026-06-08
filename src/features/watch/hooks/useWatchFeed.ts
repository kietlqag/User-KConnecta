import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { postService } from '@/services/postService';
import { mapPostsToReels } from '../utils/mapPostToReel';
import type { Reel } from '../types/watch.types';

export const WATCH_FEED_KEY = ['posts', 'watch'] as const;

const WATCH_PAGE_SIZE = 20;

function getWatchNextPageParam(lastPage: Awaited<ReturnType<typeof postService.getWatchPosts>>) {
  if (!lastPage.content.length) return undefined;
  const nextPage = lastPage.number + 1;
  if (nextPage < lastPage.totalPages) return nextPage;
  return undefined;
}

export function useWatchFeed(currentUserId: string | undefined) {
  const query = useInfiniteQuery({
    queryKey: [...WATCH_FEED_KEY, currentUserId],
    queryFn: ({ pageParam }) =>
      postService.getWatchPosts(currentUserId, pageParam, WATCH_PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: getWatchNextPageParam,
    enabled: !!currentUserId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const reels: Reel[] = useMemo(
    () => mapPostsToReels(query.data?.pages.flatMap((p) => p.content) ?? []),
    [query.data],
  );

  const isLoading =
    !!currentUserId &&
    reels.length === 0 &&
    (query.isLoading || query.isFetchingNextPage);

  return {
    data: reels,
    isLoading,
    isError: reels.length === 0 && !isLoading && query.isError,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}
