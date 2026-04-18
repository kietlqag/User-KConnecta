import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './routes';
import { queryClient } from './lib/queryClient';
import { MenuProvider } from './contexts/MenuContext';
import { Toaster } from 'sonner';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MenuProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
      </MenuProvider>
    </QueryClientProvider>
  );
}

export default App;
