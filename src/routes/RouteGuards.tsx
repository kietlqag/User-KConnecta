import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { authService } from '@/services/authService';
import { RealtimeCallProvider } from '@/contexts/RealtimeCallContext';

export function ProtectedRoute() {
  const location = useLocation();
  const currentUser = useMemo(() => authService.getCurrentUser(), []);

  if (!currentUser) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  if (currentUser.accountStatus === 'BLOCKED') {
    return <Navigate to="/auth/login" replace />;
  }

  if (currentUser.accountStatus === 'DELETED') {
    void authService.logout();
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <RealtimeCallProvider>
      <Outlet />
    </RealtimeCallProvider>
  );
}

export function GuestRoute() {
  const location = useLocation();
  const currentUser = useMemo(() => authService.getCurrentUser(), []);

  if (currentUser?.accountStatus === 'BLOCKED') {
    return location.pathname === '/auth/login' ? <Outlet /> : <Navigate to="/auth/login" replace />;
  }

  if (currentUser?.accountStatus === 'ACTIVE' || currentUser?.token) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
