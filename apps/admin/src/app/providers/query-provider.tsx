import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
            gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache for 30 minutes (was cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false, // Don't refetch on reconnect
            refetchOnMount: true, // Only refetch if stale
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}