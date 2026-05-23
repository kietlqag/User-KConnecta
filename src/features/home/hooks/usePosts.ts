import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { postService } from '@/services/postService';

export const POSTS_FEED_KEY = ['posts', 'feed'] as const;

export function usePostsFeed(currentUserId: string | undefined) {
  return useInfiniteQuery({
    queryKey: [...POSTS_FEED_KEY, currentUserId],
    queryFn: ({ pageParam }) =>
      postService.getAllPosts(currentUserId, undefined, pageParam, 10),
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
  });
}

export function useHighlightedPost(postId: string | null, currentUserId: string | undefined) {
  return useQuery({
    queryKey: ['posts', 'detail', postId],
    queryFn: () => postService.getPostById(postId!, currentUserId),
    enabled: !!postId && !!currentUserId,
    staleTime: 30_000,
  });
}
