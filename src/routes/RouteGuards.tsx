import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AUTH_STORAGE_KEY, AUTH_USER_CHANGED_EVENT, authService } from '@/services/authService';

function useAuthUser() {
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());

  useEffect(() => {
    const syncAuth = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener(AUTH_USER_CHANGED_EVENT, syncAuth);
    window.addEventListener('storage', (event) => {
      if (event.key === AUTH_STORAGE_KEY) {
        syncAuth();
      }
    });
    return () => {
      window.removeEventListener(AUTH_USER_CHANGED_EVENT, syncAuth);
    };
  }, []);

  return currentUser;
}

export function ProtectedRoute() {
  const location = useLocation();
  const currentUser = useAuthUser();

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

  return <Outlet />;
}

export function GuestRoute() {
  const location = useLocation();
  const currentUser = useAuthUser();

  if (currentUser?.accountStatus === 'BLOCKED') {
    return location.pathname === '/auth/login' ? <Outlet /> : <Navigate to="/auth/login" replace />;
  }

  if (currentUser?.accountStatus === 'ACTIVE') {
    if (location.pathname === '/auth/forgot-password') {
      return <Outlet />;
    }
    const redirectTo =
      (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/home';
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
