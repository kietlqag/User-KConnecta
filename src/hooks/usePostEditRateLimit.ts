import { useQuery } from '@tanstack/react-query';
import { postService } from '@/services/postService';

export function usePostEditRateLimit(enabled: boolean) {
  return useQuery({
    queryKey: ['posts', 'edit-rate-limit'],
    queryFn: () => postService.getPostEditRateLimit(),
    enabled,
    staleTime: 3_000,
    refetchInterval: (query) => {
      if (!enabled) return false;
      const data = query.state.data;
      if (data && data.limitPerMinute > 0 && data.remaining <= 0) {
        return 1_000;
      }
      return 10_000;
    },
    refetchOnWindowFocus: enabled,
  });
}
