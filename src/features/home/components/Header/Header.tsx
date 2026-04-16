import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router@7.1.3';
import { Search, Home, Users, Video, Store, Grid3x3, MessageCircle, Bell, Menu } from 'lucide-react';
import { MessengerPanel } from '../../../messenger/components';
import { NotificationsPanel } from '../../../notifications/components';
import { MenuPanel } from '../../../menu/components';
import { AccountMenu } from '../../../account/components';
import { SearchSuggestions } from '../../../search/components';
import { RecentSearchItem } from '../../../search/types/search.types';
import { useMenu } from '../../../../contexts/MenuContext';
import { AnimatedTabNav } from '../../../../components/AnimatedTabNav';
import { AUTH_USER_CHANGED_EVENT, authService } from '@/services/authService';
import avatarImage from 'figma:asset/34ededad5ccd5d51ad30647ea2c59d1a7ff31f90.png';
import logoV2 from '@/assets/LogoKConnecta_V2.png';

export function Header() {
  const [showMessenger, setShowMessenger] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const navigate = useNavigate();
  const { isMenuOpen, toggleMenu, setMenuOpen } = useMenu();
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

  const navItems = [
    { icon: <Home className="w-6 h-6" />, href: '/home', label: 'Home' },
    { icon: <Users className="w-6 h-6" />, href: '/friends', label: 'Friends' },
    { icon: <Video className="w-6 h-6" />, href: '/watch', label: 'Watch' },
    { icon: <Store className="w-6 h-6" />, href: '/marketplace', label: 'Marketplace' },
    { icon: <Grid3x3 className="w-6 h-6" />, href: '/groups', label: 'Groups' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 border-b border-gray-200">
      <div className="max-w-[1920px] mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Left Section - Logo & Search */}
          <div className="flex items-center gap-2 flex-1 max-w-[320px]">
            <Link to="/home" className="flex items-center gap-2 hover:bg-gray-100 rounded-full p-2 transition-colors">
              <img src={logoV2} alt="KConnecta Logo V2" className="w-10 h-10 object-contain" />
            </Link>
            
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm trên KConnecta"
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full outline-none focus:bg-gray-200 transition-colors"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) {
                    setShowSearchSuggestions(true);
                  } else {
                    setShowSearchSuggestions(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    navigate(`/search?q=${searchQuery}`);
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
            <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors lg:hidden cursor-pointer">
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
            
            <button 
              onClick={() => {
                toggleMenu();
                setShowMessenger(false);
                setShowNotifications(false);
                setShowAccountMenu(false);
              }}
              className={`hidden sm:flex p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer ${
                isMenuOpen ? 'bg-emerald-100' : 'bg-gray-100'
              }`}
              title="Menu"
              aria-label="Menu"
              aria-expanded={isMenuOpen}
              data-menu-toggle
            >
              <Grid3x3 className={`w-5 h-5 ${isMenuOpen ? 'text-emerald-600' : 'text-gray-700'}`} />
            </button>
            
            <button 
              onClick={() => {
                setShowMessenger(!showMessenger);
                setMenuOpen(false);
                setShowNotifications(false);
                setShowAccountMenu(false);
              }}
              className="hidden sm:flex relative p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 text-gray-700" />
              <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </button>
            
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                setMenuOpen(false);
                setShowMessenger(false);
                setShowAccountMenu(false);
              }}
              className="hidden sm:flex relative p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5 text-gray-700" />
              <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                5
              </span>
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
