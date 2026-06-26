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

// TEMP (design preview only): expose for seeding mock data in the browser console.
if (import.meta.env.DEV) {
  (window as unknown as { __qc?: QueryClient }).__qc = queryClient;
}
