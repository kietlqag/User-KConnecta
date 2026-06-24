import { useEffect, useState } from 'react';
import { AUTH_USER_CHANGED_EVENT, authService, type AuthUser } from '@/services/authService';
import { UserAvatar } from './UserAvatar';

interface CurrentUserAvatarProps {
  className?: string;
}

export function CurrentUserAvatar({
  className = 'w-10 h-10',
}: CurrentUserAvatarProps) {
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
    <UserAvatar
      name={currentUser?.fullName || 'Bạn'}
      avatarUrl={currentUser?.avatarUrl}
      userId={currentUser?.id}
      className={className}
      rounded="full"
    />
  );
}
