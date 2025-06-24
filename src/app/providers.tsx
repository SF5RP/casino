'use client';

import { SnackbarProvider } from 'notistack';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const queryClient = new QueryClient();

// Создаем тему с шрифтом Huninn
const theme = createTheme({
  typography: {
    fontFamily: '"Huninn", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#2ecc71',
    },
    background: {
      default: '#1d1d1d',
      paper: '#1a1a1a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#cccccc',
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider maxSnack={3}>{children}</SnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}