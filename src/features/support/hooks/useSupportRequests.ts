import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supportService } from '@/services/supportService';

export function useSupportRequests() {
  return useQuery({
    queryKey: ['support-requests', 'mine'],
    queryFn: () => supportService.getMine(),
    staleTime: 30_000,
  });
}

export function useInvalidateSupportRequests() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['support-requests', 'mine'] });
}
