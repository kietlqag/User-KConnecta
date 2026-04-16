import { useEffect, useState } from 'react';
import { AUTH_USER_CHANGED_EVENT, authService, type AuthUser } from '@/services/authService';

interface CurrentUserAvatarProps {
  className?: string;
  fallbackClassName?: string;
}

function getInitials(fullName?: string) {
  if (!fullName) {
    return 'U';
  }

  const parts = fullName
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(-2);

  if (parts.length === 0) {
    return 'U';
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}

export function CurrentUserAvatar({
  className = 'w-10 h-10',
  fallbackClassName,
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

  const initials = getInitials(currentUser?.fullName);

  if (currentUser?.avatarUrl) {
    return (
      <img
        src={currentUser.avatarUrl}
        alt={currentUser.fullName || 'User avatar'}
        className={`${className} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white ${fallbackClassName || ''}`}
    >
      <span className="text-sm font-semibold">{initials}</span>
    </div>
  );
}
