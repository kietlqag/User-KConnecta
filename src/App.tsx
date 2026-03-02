import { RouterProvider } from 'react-router@7.1.3';
import { router } from './routes';
import { MenuProvider } from './contexts/MenuContext';

function App() {
  return (
    <MenuProvider>
      <RouterProvider router={router} />
    </MenuProvider>
  );
}

export default App;