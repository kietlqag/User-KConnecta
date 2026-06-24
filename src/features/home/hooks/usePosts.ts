import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { postService, type PaginatedResponse, type PostResponse } from '@/services/postService';
import { scrollToHomeTop } from '../utils/scrollToHomeTop';

export const POSTS_FEED_KEY = ['posts', 'feed'] as const;
export const HOME_FEED_REFRESH_EVENT = 'home:feed-refresh';

/** Reset bảng tin về trang đầu và cuộn lên đầu (dùng khi bấm nút Home). */
export async function refreshHomeFeed(queryClient: QueryClient) {
  window.dispatchEvent(new CustomEvent(HOME_FEED_REFRESH_EVENT));
  await scrollToHomeTop();
  await queryClient.resetQueries({ queryKey: POSTS_FEED_KEY });
}

/** Chèn bài vừa đăng lên đầu bảng tin ngay lập tức (không cần F5). */
export function prependPostToHomeFeed(
  queryClient: QueryClient,
  userId: string | undefined,
  post: PostResponse,
) {
  if (!userId || post.status !== 'PUBLISHED') return;

  const queryKey = [...POSTS_FEED_KEY, userId] as const;

  queryClient.setQueryData<InfiniteData<PaginatedResponse<PostResponse>>>(
    queryKey,
    (old) => {
      const firstPage: PaginatedResponse<PostResponse> = {
        content: [post],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0,
      };

      if (!old?.pages?.length) {
        return { pages: [firstPage], pageParams: [0] };
      }

      const pages = old.pages.map((page, index) => {
        if (index !== 0) return page;
        const hadPost = page.content.some((p) => p.id === post.id);
        const content = [post, ...page.content.filter((p) => p.id !== post.id)];
        return {
          ...page,
          content,
          totalElements: hadPost ? page.totalElements : page.totalElements + 1,
        };
      });

      return { ...old, pages };
    },
  );

  window.dispatchEvent(new CustomEvent(HOME_FEED_REFRESH_EVENT));
  requestAnimationFrame(() => {
    void scrollToHomeTop();
  });
}

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
    // Don't refetch the whole feed when the tab regains focus — switching tabs and
    // coming back would otherwise reload the newsfeed and lose scroll position.
    refetchOnWindowFocus: false,
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
