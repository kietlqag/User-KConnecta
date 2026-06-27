import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';
import {
  Cake,
  Bookmark,
  MessageCircle,
  CalendarPlus,
} from 'lucide-react';
import { AUTH_USER_CHANGED_EVENT, authService, type AuthUser } from '@/services/authService';
import { useTodayBirthdaysSidebar } from '@/features/birthdays/hooks/useBirthdays';
import { useRecentGroupShortcuts } from '@/features/groups/hooks/useRecentGroupShortcuts';
import { UserAvatar } from '@/components/shared/UserAvatar';

export const LeftSidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLeftSidebarOpen, setLeftSidebarOpen } = useSidebar();
  const [isLargeScreen, setIsLargeScreen] = useState(() => window.innerWidth >= 1024);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const { data: todayBirthdays = [] } = useTodayBirthdaysSidebar();
  const groupShortcuts = useRecentGroupShortcuts(4);

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
      id: 'birthdays',
      icon: <Cake className="h-9 w-9 rounded-full bg-rose-100 p-2 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" />,
      label: t('nav.birthdays'),
      href: '/friends?tab=birthdays',
    },
    {
      id: 'saved',
      icon: <Bookmark className="h-9 w-9 rounded-full bg-violet-100 p-2 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />,
      label: t('nav.saved'),
      href: '/saved',
    },
    {
      id: 'messages',
      icon: <MessageCircle className="h-9 w-9 rounded-full bg-sky-100 p-2 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400" />,
      label: t('nav.messages'),
      href: '/messages',
    },
    {
      id: 'create-event',
      icon: <CalendarPlus className="h-9 w-9 rounded-full bg-orange-100 p-2 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />,
      label: t('nav.createEvent'),
      href: '/live/event',
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
                className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                aria-label={item.label}
              >
                {item.icon}
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {(groupShortcuts.length > 0 || todayBirthdays.length > 0) && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2">
            {groupShortcuts.length > 0 && (
              <div className="flex min-h-0 flex-col">
                <div className="my-2 shrink-0 border-t border-border" />
                <div className="mb-2 flex shrink-0 items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-muted-foreground">{t('sidebar.shortcuts')}</h3>
                  <button
                    type="button"
                    onClick={() => handleNavigate('/groups')}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    {t('sidebar.seeAllGroups')}
                  </button>
                </div>
                <div className="space-y-1">
                  {groupShortcuts.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => handleNavigate(`/groups/${group.id}`)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                      aria-label={group.name}
                    >
                      {group.icon ? (
                        <img
                          src={group.icon}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          {group.name.charAt(0)}
                        </div>
                      )}
                      <span className="truncate text-sm font-medium text-foreground">{group.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {todayBirthdays.length > 0 && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="my-2 shrink-0 border-t border-border" />
                <h3 className="mb-2 shrink-0 px-1 text-sm font-semibold text-muted-foreground">{t('sidebar.birthdays')}</h3>
                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-0.5 sidebar-scrollbar">
                  {todayBirthdays.map((person) => (
                    <button
                      key={person.userId}
                      type="button"
                      onClick={() => handleNavigate('/friends?tab=birthdays')}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted"
                    >
                      <UserAvatar
                        name={person.name}
                        avatarUrl={person.avatar}
                        userId={person.userId}
                        rounded="full"
                        className="h-9 w-9 shrink-0"
                      />
                      <p className="text-sm text-foreground">
                        <Trans
                          i18nKey="sidebar.birthdayToday"
                          values={{ name: person.name }}
                          components={{ strong: <strong className="font-semibold" /> }}
                        />
                        {person.age > 0 ? t('sidebar.birthdayAge', { age: person.age }) : ''}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto shrink-0 border-t border-border px-3 py-2">
          <nav
            className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] leading-tight text-muted-foreground"
            aria-label="Liên kết chính sách"
          >
            <Link to="/privacy" onClick={handlePolicyLinkClick} className="hover:underline hover:text-foreground">
              Chính sách bảo mật
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/terms" onClick={handlePolicyLinkClick} className="hover:underline hover:text-foreground">
              Điều khoản
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/contact" onClick={handlePolicyLinkClick} className="hover:underline hover:text-foreground">
              Liên hệ
            </Link>
          </nav>
          <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
            {t('nav.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </aside>
    </>
  );
};
