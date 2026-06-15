import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import './index.css';
import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000 // 5 minutes cache stale
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster 
        position="top-center" 
        toastOptions={{
          success: {
            duration: 3000,
            style: {
              background: 'var(--theme-bg-card)',
              color: 'var(--theme-text-primary)',
              border: '1px solid var(--theme-border)'
            }
          },
          error: {
            duration: 4000,
            style: {
              background: 'var(--theme-bg-card)',
              color: 'var(--theme-text-primary)',
              border: '1px solid var(--theme-border)'
            }
          }
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
);
