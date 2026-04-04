import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { MenuProvider } from './contexts/MenuContext';
import { Toaster } from 'sonner';

function App() {
  return (
    <MenuProvider>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </MenuProvider>
  );
}

export default App;
