import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';
import AppRoutes from '@/routes/AppRoutes';
import RouteTitle from '@/routes/RouteTitle';
import ErrorBoundary from '@/components/ErrorBoundary';
import env from '@/config/env';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {/* Last resort for errors outside a page (providers, layout, login) */}
        <ErrorBoundary fullScreen>
          <BrowserRouter>
            <AuthProvider>
              <ToastProvider>
                <RouteTitle />
                <AppRoutes />
              </ToastProvider>
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
        {env.IS_DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
