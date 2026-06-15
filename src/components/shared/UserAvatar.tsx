import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  getDisplayNameInitials,
  getUserAvatarBgClass,
  isPlaceholderAvatar,
} from '@/utils/userAvatarUtils';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  userId?: string;
  className?: string;
  initialsClassName?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const ROUNDED_CLASS: Record<NonNullable<UserAvatarProps['rounded']>, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

export function UserAvatar({
  name,
  avatarUrl,
  userId,
  className,
  initialsClassName = 'text-4xl font-bold tracking-wide',
  rounded = 'none',
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showFallback = isPlaceholderAvatar(avatarUrl) || imageFailed;
  const initials = getDisplayNameInitials(name);
  const colorSeed = userId || name;
  const bgClass = getUserAvatarBgClass(colorSeed);

  if (!showFallback && avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn('h-full w-full object-cover', ROUNDED_CLASS[rounded], className)}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center text-white select-none',
        bgClass,
        ROUNDED_CLASS[rounded],
        className,
      )}
      aria-label={name}
    >
      <span className={initialsClassName}>{initials}</span>
    </div>
  );
}
