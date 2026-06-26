import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logProfileTabClick, type ProfileTabId } from '../../utils/profileTabLogger';

interface ProfileTabsProps {
  userId?: string;
  profileKey?: string;
}

export function ProfileTabs({ userId, profileKey }: ProfileTabsProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const currentPath = location.pathname;
  const resolvedProfileKey = profileKey || userId || '';

  const tabs: { labelKey: ProfileTabId; path: string }[] = [
    { labelKey: 'all', path: `/profile/${resolvedProfileKey}` },
    { labelKey: 'about', path: `/profile/${resolvedProfileKey}/about` },
    { labelKey: 'friends', path: `/profile/${resolvedProfileKey}/friends` },
    { labelKey: 'photos', path: `/profile/${resolvedProfileKey}/photos` },
    { labelKey: 'watch', path: `/profile/${resolvedProfileKey}/reels` },
    { labelKey: 'albums', path: `/profile/${resolvedProfileKey}/albums` },
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
                onClick={() => logProfileTabClick(tab.labelKey, tab.path, currentPath)}
                className={`whitespace-nowrap px-4 py-4 font-medium transition-colors ${
                  isActive(tab.path)
                    ? 'border-b-4 border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'rounded-t-lg text-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {t(`profileTabs.${tab.labelKey}`)}
              </Link>
            ))}

          </nav>

        </div>
      </div>

    </div>
  );
}
