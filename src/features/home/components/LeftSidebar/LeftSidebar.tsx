import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';
import {
  Users,
  Bookmark,
  Shapes,
  Clapperboard,
} from 'lucide-react';
import { AUTH_USER_CHANGED_EVENT, authService, type AuthUser } from '@/services/authService';
import { useTodayBirthdaysSidebar } from '@/features/birthdays/hooks/useBirthdays';
import { UserAvatar } from '@/components/shared/UserAvatar';

export const LeftSidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLeftSidebarOpen, setLeftSidebarOpen } = useSidebar();
  const [isLargeScreen, setIsLargeScreen] = useState(() => window.innerWidth >= 1024);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const { data: todayBirthdays = [] } = useTodayBirthdaysSidebar();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const syncScreenSize = () => setIsLargeScreen(mediaQuery.matches);
    mediaQuery.addEventListener('change', syncScreenSize);
    return () => mediaQuery.removeEventListener('change', syncScreenSize);
  }, []);

  const handlePolicyLinkClick = () => {
    if (!isLargeScreen) {
      setLeftSidebarOpen(false);
    }
  };

  const handleNavigate = (href: string) => {
    navigate(href);
    if (!isLargeScreen) {
      setLeftSidebarOpen(false);
    }
  };

  useEffect(() => {
    const syncAuthUser = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener(AUTH_USER_CHANGED_EVENT, syncAuthUser);
    window.addEventListener('storage', syncAuthUser);
    return () => {
      window.removeEventListener(AUTH_USER_CHANGED_EVENT, syncAuthUser);
      window.removeEventListener('storage', syncAuthUser);
    };
  }, []);

  const fullName = currentUser?.fullName || t('messenger.unknownSender');
  const userId = currentUser?.id;
  const userUsername = currentUser?.username;
  const avatarUrl = currentUser?.avatarUrl;

  const menuItems = [
    {
      id: 'profile',
      icon: (
        <UserAvatar
          name={fullName}
          avatarUrl={avatarUrl}
          userId={userId}
          rounded="full"
          className="h-9 w-9"
        />
      ),
      label: fullName,
      href: `/profile/${userUsername || userId}`,
    },
    {
      id: 'friends',
      icon: <Users className="h-9 w-9 rounded-full bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />,
      label: t('nav.friends'),
      href: '/friends',
    },
    {
      id: 'saved',
      icon: <Bookmark className="h-9 w-9 rounded-full bg-violet-100 p-2 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />,
      label: t('nav.saved'),
      href: '/saved',
    },
    {
      id: 'groups',
      icon: <Shapes className="h-9 w-9 rounded-full bg-sky-100 p-2 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400" />,
      label: t('nav.groups'),
      href: '/groups',
    },
    {
      id: 'video',
      icon: <Clapperboard className="h-9 w-9 rounded-full bg-orange-100 p-2 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />,
      label: t('nav.video'),
      href: '/watch',
    },
  ];

  return (
    <>
      {isLeftSidebarOpen && !isLargeScreen && (
        <button
          type="button"
          className="fixed inset-0 top-14 z-20 cursor-default bg-black/40"
          onClick={() => setLeftSidebarOpen(false)}
          aria-label={t('nav.closeNav')}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-14 z-30 flex h-[calc(100vh-56px)] w-72 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-in-out lg:translate-x-0',
          isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        inert={!isLargeScreen && !isLeftSidebarOpen ? true : undefined}
      >
        <div className="shrink-0 p-2">
          <nav className="space-y-1" role="navigation" aria-label={t('nav.mainNav')}>
            {menuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.href)}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label={item.label}
              >
                {item.icon}
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {todayBirthdays.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col px-2 pb-2">
            <div className="my-2 shrink-0 border-t border-gray-300 dark:border-gray-700" />
            <h3 className="mb-2 shrink-0 px-1 text-sm font-semibold text-gray-600 dark:text-gray-400">{t('sidebar.birthdays')}</h3>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-0.5 sidebar-scrollbar">
              {todayBirthdays.map((person) => (
                <button
                  key={person.userId}
                  type="button"
                  onClick={() => handleNavigate('/friends?tab=birthdays')}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <UserAvatar
                    name={person.name}
                    avatarUrl={person.avatar}
                    userId={person.userId}
                    rounded="full"
                    className="h-9 w-9 shrink-0"
                  />
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    <span
                      dangerouslySetInnerHTML={{
                        __html: t('sidebar.birthdayToday', { name: person.name }),
                      }}
                    />
                    {person.age > 0 ? t('sidebar.birthdayAge', { age: person.age }) : ''}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto shrink-0 border-t border-gray-200 px-3 py-3 dark:border-gray-700">
          <nav
            className="flex flex-col gap-1.5 text-xs text-gray-500 dark:text-gray-400"
            aria-label="Liên kết chính sách"
          >
            <Link to="/privacy" onClick={handlePolicyLinkClick} className="hover:underline hover:text-gray-700 dark:hover:text-gray-300">
              Chính sách bảo mật
            </Link>
            <Link to="/terms" onClick={handlePolicyLinkClick} className="hover:underline hover:text-gray-700 dark:hover:text-gray-300">
              Điều khoản dịch vụ
            </Link>
            <Link to="/contact" onClick={handlePolicyLinkClick} className="hover:underline hover:text-gray-700 dark:hover:text-gray-300">
              Liên hệ
            </Link>
          </nav>
          <p className="mt-2.5 text-xs text-gray-500 dark:text-gray-400">
            {t('nav.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </aside>
    </>
  );
};
