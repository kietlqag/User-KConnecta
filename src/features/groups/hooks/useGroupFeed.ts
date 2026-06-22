import { useInfiniteQuery } from '@tanstack/react-query';
import { postService } from '@/services/postService';

export const GROUP_FEED_KEY = ['posts', 'group-feed'] as const;

export function useGroupFeed(currentUserId: string | undefined) {
  return useInfiniteQuery({
    queryKey: [...GROUP_FEED_KEY, currentUserId],
    queryFn: ({ pageParam }) => postService.getGroupFeedPosts(currentUserId, pageParam, 10),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.number + 1;
      if (nextPage < lastPage.totalPages) return nextPage;
      // Fallback when metadata is missing but page is full
      if (lastPage.content.length >= 10) return nextPage;
      return undefined;
    },
    enabled: !!currentUserId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
