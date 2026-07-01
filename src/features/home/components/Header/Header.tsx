import { vi } from '@/constants/vi';
import { formatVi } from '@/constants/formatVi';
import { useEffect, useState, useMemo, useCallback, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Home, Users, Shapes, Clapperboard, Radio, MessageCircle, Bell, Menu } from 'lucide-react';
import { MessengerPanel } from '../../../messenger/components';
import { NotificationsPanel } from '../../../notifications/components';
import { AccountMenu } from '../../../account/components';
import { SearchSuggestions } from '../../../search/components';
import { RecentSearchItem } from '../../../search/types/search.types';
import { useSidebar } from '../../../../contexts/SidebarContext';
import { AnimatedTabNav } from '../../../../components/AnimatedTabNav';
import { useMessengerUnreadCount } from '../../../messenger/hooks/useMessengerUnreadCount';
import { useRealtimeCall } from '@/contexts/RealtimeCallContext';
import { AUTH_USER_CHANGED_EVENT, authService } from '@/services/authService';
import { notificationService } from '@/services/notificationService';
import { searchHistoryService } from '@/services/searchHistoryService';
import { UserAvatar } from '@/components/shared/UserAvatar';
import logoV2 from '@/assets/LogoKConnecta_V2.png';
import { LIVE_NAV_LABEL } from '@/components/shared';
import { refreshHomeFeed } from '../../hooks/usePosts';

export function Header() {  const [showMessenger, setShowMessenger] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const isHomePage = location.pathname === '/home' || location.pathname === '/home/';
  const { subscribeNotificationEvents } = useRealtimeCall();
  const { isLeftSidebarOpen, toggleLeftSidebar } = useSidebar();

  useEffect(() => {
    if (location.pathname === '/search') {
      setSearchQuery(searchParams.get('q') ?? '');
      return;
    }
    if (location.pathname === '/watch' && searchParams.get('from') === 'search') {
      setSearchQuery(searchParams.get('q') ?? '');
    }
  }, [location.pathname, searchParams]);

  useEffect(() => {
    const syncAuthUser = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener(AUTH_USER_CHANGED_EVENT, syncAuthUser);
    window.addEventListener('storage', syncAuthUser);
    return () => {
      window.removeEventListener(AUTH_USER_CHANGED_EVENT, syncAuthUser);
      window.removeEventListener('storage', syncAuthUser);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUnreadNotifications(0);
      return;
    }

    const fetchCount = () => {
      notificationService.getUnreadCount(currentUser.id).then(setUnreadNotifications).catch(console.error);
    };

    const onUnreadChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ unreadCount?: number }>).detail;
      if (typeof detail?.unreadCount === 'number') {
        setUnreadNotifications(Math.max(0, detail.unreadCount));
      }
    };

    fetchCount(); // initial fetch

    // Fallback poll every 2 minutes in case websocket disconnects silently.
    const interval = setInterval(fetchCount, 120_000);

    // Allow other components to trigger an immediate refresh
    window.addEventListener('notification:refresh', fetchCount);
    window.addEventListener('notification:unread-changed', onUnreadChanged);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notification:refresh', fetchCount);
      window.removeEventListener('notification:unread-changed', onUnreadChanged);
    };
  }, [currentUser, showNotifications]);

  useEffect(() => {
    if (!currentUser?.id) return;
    return subscribeNotificationEvents((event) => {
      if (typeof event?.unreadCount === 'number') {
        setUnreadNotifications(Math.max(0, event.unreadCount));
      } else {
        notificationService.getUnreadCount(currentUser.id).then(setUnreadNotifications).catch(console.error);
      }
    });
  }, [currentUser?.id, subscribeNotificationEvents]);

  const unreadMessagesCount = useMessengerUnreadCount();

  const handleHomeClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      const onHome = location.pathname === '/home' || location.pathname === '/home/';
      if (!onHome || location.search) {
        navigate('/home', { replace: onHome });
      }
      void refreshHomeFeed(queryClient);
    },
    [location.pathname, location.search, navigate, queryClient],
  );

  const navItems = useMemo(() => [
    { icon: <Home className="w-6 h-6" />, href: '/home', label: vi.nav.home },
    { icon: <Users className="w-6 h-6" />, href: '/friends', label: vi.nav.friends },
    { icon: <Clapperboard className="w-6 h-6" />, href: '/watch', label: vi.nav.watch },
    { icon: <Shapes className="w-6 h-6" />, href: '/groups', label: vi.nav.groups },
    { icon: <Radio className="w-6 h-6" />, href: '/live', label: LIVE_NAV_LABEL },
  ], [t]);

  const headerActionBtnClass =
    'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted transition-colors cursor-pointer hover:bg-muted/80';

  return (
    <header className="fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-md shadow-sm z-50 border-b border-border">
      <div className="max-w-[1920px] mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Left Section - Logo & Search */}
          <div className="flex items-center gap-2 flex-1 max-w-[320px]">
            {isHomePage && (
              <button
                type="button"
                onClick={() => {
                  toggleLeftSidebar();
                  setShowMessenger(false);
                  setShowNotifications(false);
                  setShowAccountMenu(false);
                }}
                className={`lg:hidden p-2 rounded-full transition-colors cursor-pointer shrink-0 ${ isLeftSidebarOpen ? 'bg-accent text-primary' : 'bg-muted hover:bg-muted/80' }`}
                title="Menu điều hướng"
                aria-label="Menu điều hướng"
                aria-expanded={isLeftSidebarOpen}
              >
                <Menu className={`w-6 h-6 ${isLeftSidebarOpen ? 'text-primary' : 'text-foreground'}`} />
              </button>
            )}
            <Link
              to="/home"
              onClick={handleHomeClick}
              className="flex items-center gap-2 hover:bg-muted rounded-full p-2 transition-colors"
            >              <img src={logoV2} alt="KConnecta" width={40} height={40} className="w-10 h-10 object-contain dark:drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]" />
            </Link>
            
            <div className="flex-1 relative">
              <label htmlFor="header-search" className="sr-only">
                Tìm kiếm trên KConnecta
              </label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
              <input
                id="header-search"
                type="search"
                name="q"
                placeholder="Tìm kiếm trên KConnecta"
                className="w-full pl-10 pr-4 py-2 bg-muted text-foreground placeholder:text-muted-foreground rounded-full outline-none focus:bg-muted/70 transition-colors"
                value={searchQuery}
                onFocus={() => setShowSearchSuggestions(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    searchHistoryService.add({ type: 'keyword', text: searchQuery.trim() });
                    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                    setShowSearchSuggestions(false);
                  }
                }}
              />
              {showSearchSuggestions && (
                <SearchSuggestions
                  query={searchQuery}
                  onClose={() => setShowSearchSuggestions(false)}
                />
              )}
            </div>
          </div>

          {/* Center Section - Navigation */}
          <AnimatedTabNav items={navItems} onHomeClick={handleHomeClick} />
          {/* Right Section - User Actions */}
          <div className="flex flex-1 max-w-[320px] items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => {
                setShowMessenger(!showMessenger);
                setShowNotifications(false);
                setShowAccountMenu(false);
              }}
              className={headerActionBtnClass}
              title={formatVi(vi.messenger.title, { defaultValue: 'Tin nhắn' })}
              aria-label={formatVi(vi.messenger.title, { defaultValue: 'Tin nhắn' })}
            >
              <MessageCircle className="h-5 w-5 text-foreground" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowMessenger(false);
                setShowAccountMenu(false);
              }}
              className={`${headerActionBtnClass} hidden sm:flex`}
              title={formatVi(vi.nav.notifications, { defaultValue: 'Thông báo' })}
              aria-label={formatVi(vi.nav.notifications, { defaultValue: 'Thông báo' })}
            >
              <Bell className="h-5 w-5 text-foreground" />
              {unreadNotifications > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </button>

            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setShowAccountMenu(!showAccountMenu);
                  setShowMessenger(false);
                  setShowNotifications(false);
                }}
                className="h-9 w-9 shrink-0 overflow-hidden rounded-full transition-opacity hover:opacity-90 cursor-pointer"
                data-account-toggle
                aria-label="Menu tài khoản"
                aria-expanded={showAccountMenu}
              >
                <UserAvatar
                  name={currentUser?.fullName || 'Bạn'}
                  avatarUrl={currentUser?.avatarUrl}
                  userId={currentUser?.id}
                  rounded="full"
                  className="h-9 w-9"
                />
              </button>

              {showAccountMenu && <AccountMenu onClose={() => setShowAccountMenu(false)} />}
            </div>
          </div>
        </div>
      </div>

      {/* Messenger Panel */}
      {showMessenger && <MessengerPanel onClose={() => setShowMessenger(false)} />}
      {/* Notifications Panel */}
      {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
    </header>
  );
}


