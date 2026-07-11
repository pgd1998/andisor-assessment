import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query client. Inventory data changes infrequently within a
 * session, so we keep it fresh for a short window and avoid noisy refetches.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
