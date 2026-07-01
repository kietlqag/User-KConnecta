import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { router } from './routes';
import { queryClient } from './lib/queryClient';
import { MenuProvider } from './contexts/MenuContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { Toaster } from '@/components/ui/sonner';
import { ScreenTimeTracker } from '@/features/settings/components/ScreenTimeTracker';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" storageKey="kconnecta-theme">
        <MenuProvider>
          <SidebarProvider>
            <RouterProvider router={router} />
            <Toaster position="top-right" richColors />
            <ScreenTimeTracker />
          </SidebarProvider>
        </MenuProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
