import { useState } from 'react';
import { User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPlaceholderAvatar, resolveUserAvatarUrl } from '@/utils/userAvatarUtils';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  userId?: string;
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  variant?: 'user' | 'group';
  /** @deprecated Ignored — fallback uses gray icon instead of initials. */
  initialsClassName?: string;
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
  className,
  rounded = 'none',
  variant = 'user',
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedUrl = resolveUserAvatarUrl(avatarUrl);
  const showFallback = !resolvedUrl || imageFailed;
  const FallbackIcon = variant === 'group' ? Users : User;

  if (!showFallback && resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt={name}
        className={cn('h-full w-full object-cover', ROUNDED_CLASS[rounded], className)}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
        ROUNDED_CLASS[rounded],
        className,
      )}
      aria-label={name}
    >
      <FallbackIcon className="h-[52%] w-[52%] min-h-4 min-w-4" strokeWidth={1.75} aria-hidden />
    </div>
  );
}
