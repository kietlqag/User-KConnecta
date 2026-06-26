import { Navigate } from 'react-router-dom';
import { authService } from '@/services/authService';

/** /profile → chuyển tới trang cá nhân của user đang đăng nhập */
export function ProfileIndexRedirect() {
  const user = authService.getCurrentUser();
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }
  return <Navigate to={`/profile/${user.username || user.id}`} replace />;
}
