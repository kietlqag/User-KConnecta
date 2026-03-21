import { RouterProvider } from 'react-router-dom';
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