import { useState } from 'react';
import { Link } from 'react-router@7.1.3';
import { Search, Home, Users, Video, Store, Grid3x3, MessageCircle, Bell, Menu } from 'lucide-react';
import { MessengerPanel } from '../../../messenger/components';
import { NotificationsPanel } from '../../../notifications/components';
import { MenuPanel } from '../../../menu/components';
import { useMenu } from '../../../../contexts/MenuContext';
import { AnimatedTabNav } from '../../../../components/AnimatedTabNav';
import { CurrentUserAvatar } from '@/components/shared';

export function GroupsHeader() {
  const [showMessenger, setShowMessenger] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { isMenuOpen, toggleMenu, setMenuOpen } = useMenu();

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
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-white">K</span>
              </div>
            </Link>
            
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm trên KConnecta"
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full outline-none focus:bg-gray-200 transition-colors"
              />
            </div>
          </div>

          {/* Center Section - Navigation */}
          <AnimatedTabNav items={navItems} />

          {/* Right Section - User Actions */}
          <div className="flex items-center gap-2 flex-1 justify-end max-w-[320px]">
            <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors lg:hidden">
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
            
            <button 
              onClick={() => {
                toggleMenu();
                setShowMessenger(false);
                setShowNotifications(false);
              }}
              className={`hidden sm:flex p-2 hover:bg-gray-200 rounded-full transition-colors ${
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
              }}
              className="hidden sm:flex relative p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
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
              }}
              className="hidden sm:flex relative p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-700" />
              <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                5
              </span>
            </button>
            
            <button className="w-10 h-10 rounded-full overflow-hidden hover:opacity-90 transition-opacity">
              <CurrentUserAvatar className="w-10 h-10" />
            </button>
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
