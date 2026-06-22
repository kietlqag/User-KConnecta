import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authService } from '@/services/authService';

interface ProfileTabsProps {
  userId?: string;
  profileKey?: string;
  isOwnProfile?: boolean;
}

export function ProfileTabs({ userId, profileKey, isOwnProfile: isOwnProfileProp }: ProfileTabsProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const currentUser = authService.getCurrentUser();
  const resolvedProfileKey = profileKey || userId || '';
  const isOwnProfile = isOwnProfileProp ?? currentUser?.id === resolvedProfileKey;

  const tabs = [
    { label: 'Tất cả', path: `/profile/${resolvedProfileKey}` },
    { label: 'Giới thiệu', path: `/profile/${resolvedProfileKey}/about` },
    { label: 'Bạn bè', path: `/profile/${resolvedProfileKey}/friends` },
    { label: 'Ảnh', path: `/profile/${resolvedProfileKey}/photos` },
    { label: 'Watch', path: `/profile/${resolvedProfileKey}/reels` },
    { label: 'Thích', path: `/profile/${resolvedProfileKey}/likes` },
    ...(isOwnProfile ? [{ label: 'Bài đã lên lịch', path: `/profile/${resolvedProfileKey}/scheduled` }] : []),
  ];

  const isActive = (path: string) => {
    if (path === `/profile/${resolvedProfileKey}`) {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className="sticky top-14 z-40 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="mx-auto max-w-[1100px] px-4">
        <div className="flex items-center justify-between">
          <nav className="-mb-px flex items-center gap-2 overflow-x-auto scrollbar-none">
            {tabs.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={`whitespace-nowrap px-4 py-4 font-medium transition-colors ${
                  isActive(tab.path)
                    ? 'border-b-4 border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'rounded-t-lg text-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </Link>
            ))}

          </nav>

        </div>
      </div>

    </div>
  );
}

