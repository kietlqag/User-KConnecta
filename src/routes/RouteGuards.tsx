import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authService } from '@/services/authService';

export function ProtectedRoute() {
  const location = useLocation();
  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const currentUser = authService.getCurrentUser();

  if (currentUser) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
