import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Home, Users, Shapes, Video, Store, Grid3x3, Radio, MessageCircle, Bell, Menu } from 'lucide-react';
import { MessengerPanel } from '../../../messenger/components';
import { NotificationsPanel } from '../../../notifications/components';
import { MenuPanel } from '../../../menu/components';
import { AccountMenu } from '../../../account/components';
import { SearchSuggestions } from '../../../search/components';
import { RecentSearchItem } from '../../../search/types/search.types';
import { useMenu } from '../../../../contexts/MenuContext';
import { useSidebar } from '../../../../contexts/SidebarContext';
import { AnimatedTabNav } from '../../../../components/AnimatedTabNav';
import { useMessengerUnreadCount } from '../../../messenger/hooks/useMessengerUnreadCount';
import { useRealtimeCall } from '@/contexts/RealtimeCallContext';
import { AUTH_USER_CHANGED_EVENT, authService } from '@/services/authService';
import { notificationService } from '@/services/notificationService';
import { searchHistoryService } from '@/services/searchHistoryService';
import avatarImage from 'figma:asset/34ededad5ccd5d51ad30647ea2c59d1a7ff31f90.png';
import logoV2 from '@/assets/LogoKConnecta_V2.png';

export function Header() {
  const [showMessenger, setShowMessenger] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/home' || location.pathname === '/home/';
  const { subscribeNotificationEvents } = useRealtimeCall();
  const { isMenuOpen, toggleMenu, setMenuOpen } = useMenu();
  const { isLeftSidebarOpen, toggleLeftSidebar } = useSidebar();
  const userAvatar = currentUser?.avatarUrl || avatarImage;

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

  const navItems = [
    { icon: <Home className="w-6 h-6" />, href: '/home', label: 'Home' },
    { icon: <Users className="w-6 h-6" />, href: '/friends', label: 'Bạn bè' },
    { icon: <Video className="w-6 h-6" />, href: '/watch', label: 'Watch' },
    { icon: <Shapes className="w-6 h-6" />, href: '/groups', label: 'Groups' },
    { icon: <Radio className="w-6 h-6" />, href: '/live', label: 'LiveStream' },
  ];

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
                  setMenuOpen(false);
                  setShowMessenger(false);
                  setShowNotifications(false);
                  setShowAccountMenu(false);
                }}
                className={`lg:hidden p-2 rounded-full transition-colors cursor-pointer shrink-0 ${
                  isLeftSidebarOpen ? 'bg-accent text-primary' : 'bg-muted hover:bg-muted/80'
                }`}
                title="Menu điều hướng"
                aria-label="Menu điều hướng"
                aria-expanded={isLeftSidebarOpen}
              >
                <Menu className={`w-6 h-6 ${isLeftSidebarOpen ? 'text-primary' : 'text-foreground'}`} />
              </button>
            )}
            <Link to="/home" className="flex items-center gap-2 hover:bg-muted rounded-full p-2 transition-colors">
              <img src={logoV2} alt="KConnecta Logo V2" className="w-10 h-10 object-contain dark:drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]" />
            </Link>
            
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
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
                    setSearchQuery('');
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
          <AnimatedTabNav items={navItems} />

          {/* Right Section - User Actions */}
          <div className="flex items-center gap-2 flex-1 justify-end max-w-[320px]">
            <button 
              onClick={() => {
                toggleMenu();
                setShowMessenger(false);
                setShowNotifications(false);
                setShowAccountMenu(false);
              }}
              className={`hidden sm:flex p-2 hover:bg-muted/80 rounded-full transition-colors cursor-pointer ${
                isMenuOpen ? 'bg-accent text-primary' : 'bg-muted'
              }`}
              title="Menu"
              aria-label="Menu"
              aria-expanded={isMenuOpen}
              data-menu-toggle
            >
              <Grid3x3 className={`w-5 h-5 ${isMenuOpen ? 'text-primary' : 'text-foreground'}`} />
            </button>
            
            <button 
              onClick={() => {
                setShowMessenger(!showMessenger);
                setMenuOpen(false);
                setShowNotifications(false);
                setShowAccountMenu(false);
              }}
              className="hidden sm:flex relative p-2 bg-muted hover:bg-muted/80 rounded-full transition-colors cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 text-foreground" />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                </span>
              )}
            </button>
            
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                setMenuOpen(false);
                setShowMessenger(false);
                setShowAccountMenu(false);
              }}
              className="hidden sm:flex relative p-2 bg-muted hover:bg-muted/80 rounded-full transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5 text-foreground" />
              {unreadNotifications > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </button>
            
            <div className="relative">
              <button
                onClick={() => {
                  setShowAccountMenu(!showAccountMenu);
                  setMenuOpen(false);
                  setShowMessenger(false);
                  setShowNotifications(false);
                }}
                className="w-10 h-10 rounded-full overflow-hidden hover:opacity-90 transition-opacity cursor-pointer"
                data-account-toggle
              >
                <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
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
      {/* Menu Panel */}
      {isMenuOpen && <MenuPanel onClose={() => setMenuOpen(false)} />}
    </header>
  );
}


