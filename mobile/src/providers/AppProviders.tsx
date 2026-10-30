import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';

import { ApiError } from '@/lib/api-client';
import { AuthProvider } from '@/providers/AuthProvider';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Retry a flaky connection once; a server answer (401/404/422) will not change by retrying.
        retry: (failureCount, error) => !(error instanceof ApiError) && failureCount < 1,
      },
      // Writes are never retried automatically: the screens retry with the same Idempotency-Key.
      mutations: { retry: false },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    // Refetch when the owner returns to the app, so other devices' changes show up.
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });

    return () => subscription.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
