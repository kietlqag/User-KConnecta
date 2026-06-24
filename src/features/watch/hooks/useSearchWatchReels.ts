import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mapSearchPostsToReels } from '@/features/search/utils/searchReelUtils';
import type { SearchResultPost } from '@/features/search/types/search.types';
import { searchService } from '@/services/searchService';
import type { Reel } from '../types/watch.types';

export const SEARCH_WATCH_KEY = ['search', 'watch'] as const;

export function useSearchWatchReels(
  query: string | null,
  playlistIds: string[] | null,
  enabled: boolean,
) {
  const trimmedQuery = query?.trim() ?? '';
  const playlistKey = playlistIds?.join(',') ?? '';

  const searchQuery = useQuery({
    queryKey: [...SEARCH_WATCH_KEY, trimmedQuery, playlistKey],
    queryFn: () => searchService.search(trimmedQuery),
    enabled: enabled && !!trimmedQuery && !!playlistIds?.length,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const reels: Reel[] = useMemo(() => {
    if (!playlistIds?.length || !searchQuery.data) return [];
    const posts = searchQuery.data.posts as SearchResultPost[];
    return mapSearchPostsToReels(posts, playlistIds);
  }, [playlistIds, searchQuery.data]);

  const isLoading = enabled && reels.length === 0 && searchQuery.isLoading;

  return {
    data: reels,
    isLoading,
    isError: reels.length === 0 && !isLoading && searchQuery.isError,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: async () => undefined,
  };
}
