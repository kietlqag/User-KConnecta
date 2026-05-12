import { useEffect, useState } from 'react';
import { AUTH_USER_CHANGED_EVENT, authService, type AuthUser } from '@/services/authService';
import { CurrentUserAvatar } from '@/components/shared';

export const LiveSidebar = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());

  useEffect(() => {
    const syncAuthUser = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener(AUTH_USER_CHANGED_EVENT, syncAuthUser);
    window.addEventListener('storage', syncAuthUser);
    return () => {
      window.removeEventListener(AUTH_USER_CHANGED_EVENT, syncAuthUser);
      window.removeEventListener('storage', syncAuthUser);
    };
  }, []);

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-4">
      <h2 className="text-xl font-bold mb-6">Tạo video trực tiếp</h2>

      <div className="flex items-center gap-3 mb-6">
        <CurrentUserAvatar />
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{currentUser?.fullName || 'Người dùng'}</h3>
          <p className="text-xs text-gray-500">Người tổ chức - Trang cá nhân của bạn</p>
        </div>
      </div>
    </div>
  );
};
