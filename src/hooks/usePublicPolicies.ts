import { useQuery } from '@tanstack/react-query';
import { policyService } from '@/services/policyService';

export function usePublicPolicies() {
  return useQuery({
    queryKey: ['policies', 'public'],
    queryFn: () => policyService.getPublicPolicies(),
    staleTime: 0,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}
