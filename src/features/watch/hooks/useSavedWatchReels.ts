import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { postService, SAVED_POSTS_CHANGED_EVENT } from '@/services/postService';
import { mapPostsToReels } from '../utils/mapPostToReel';
import type { Reel } from '../types/watch.types';

export const SAVED_WATCH_KEY = ['posts', 'watch', 'saved'] as const;

export function useSavedWatchReels(currentUserId: string | undefined, enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const handleSavedChanged = () => {
      void queryClient.invalidateQueries({ queryKey: SAVED_WATCH_KEY });
    };

    window.addEventListener(SAVED_POSTS_CHANGED_EVENT, handleSavedChanged);
    return () => window.removeEventListener(SAVED_POSTS_CHANGED_EVENT, handleSavedChanged);
  }, [enabled, queryClient]);

  const query = useQuery({
    queryKey: [...SAVED_WATCH_KEY, currentUserId],
    queryFn: () => postService.getSavedPosts(currentUserId!),
    enabled: enabled && !!currentUserId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const reels: Reel[] = useMemo(
    () => mapPostsToReels(query.data ?? []),
    [query.data],
  );

  const isLoading = enabled && !!currentUserId && reels.length === 0 && query.isLoading;

  return {
    data: reels,
    isLoading,
    isFetched: query.isFetched,
    isError: reels.length === 0 && !isLoading && query.isError,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: async () => undefined,
  };
}
