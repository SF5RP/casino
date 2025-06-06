'use client';

import { SnackbarProvider } from 'notistack';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider maxSnack={3}>{children}</SnackbarProvider>
    </QueryClientProvider>
  );
}