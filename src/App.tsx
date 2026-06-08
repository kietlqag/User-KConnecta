import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './routes';
import { queryClient } from './lib/queryClient';
import { MenuProvider } from './contexts/MenuContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { Toaster } from 'sonner';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MenuProvider>
        <SidebarProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" richColors />
        </SidebarProvider>
      </MenuProvider>
    </QueryClientProvider>
  );
}

export default App;
