import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/** Refetch public policies when a modal opens so admin changes apply immediately. */
export function useRefreshPoliciesOnOpen(isOpen: boolean) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (isOpen) {
      void queryClient.invalidateQueries({ queryKey: ['policies', 'public'] });
    }
  }, [isOpen, queryClient]);
}
