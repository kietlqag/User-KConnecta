import { useQuery } from '@tanstack/react-query';
import { policyService } from '@/services/policyService';

export function usePublicPolicies() {
  return useQuery({
    queryKey: ['policies', 'public'],
    queryFn: () => policyService.getPublicPolicies(),
    staleTime: 5 * 60 * 1000,
  });
}
