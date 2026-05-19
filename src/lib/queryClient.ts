import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30 s before data is considered stale
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,                // mutations handle their own retry
    },
  },
});
