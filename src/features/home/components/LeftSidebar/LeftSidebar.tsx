import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Clock, 
  Bookmark, 
  UsersRound, 
  Video, 
  Store, 
  Rss,
  Calendar,
  Flag,
  ChevronDown,
  Settings,
  HelpCircle,
  Moon
} from 'lucide-react';
import { authService } from '@/services/authService';

export const LeftSidebar = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const fullName = currentUser?.fullName || 'Quang Khải';
  const username = currentUser?.username || 'quockiet';
  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const menuItems = [
    {
      id: 'profile',
      icon: (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white">
          <span className="text-sm font-semibold">{initials}</span>
        </div>
      ),
      label: fullName,
      href: `/profile/${username}`,
    },
    {
      id: 'friends',
      icon: <Users className="w-9 h-9 p-2 rounded-full bg-blue-100 text-blue-600" />,
      label: 'Bạn bè',
      href: '/friends',
    },
    {
      id: 'memories',
      icon: <Clock className="w-9 h-9 p-2 rounded-full bg-blue-100 text-blue-600" />,
      label: 'Kỷ niệm',
      href: '/memories',
    },
    {
      id: 'saved',
      icon: <Bookmark className="w-9 h-9 p-2 rounded-full bg-purple-100 text-purple-600" />,
      label: 'Đã lưu',
      href: '/saved',
    },
    {
      id: 'groups',
      icon: <UsersRound className="w-9 h-9 p-2 rounded-full bg-blue-100 text-blue-600" />,
      label: 'Nhóm',
      href: '/groups',
    },
    {
      id: 'video',
      icon: <Video className="w-9 h-9 p-2 rounded-full bg-blue-100 text-blue-600" />,
      label: 'Video',
      href: '/watch',
    },
    {
      id: 'marketplace',
      icon: <Store className="w-9 h-9 p-2 rounded-full bg-blue-100 text-blue-600" />,
      label: 'Marketplace',
      href: '/marketplace',
    },
    {
      id: 'feeds',
      icon: <Rss className="w-9 h-9 p-2 rounded-full bg-blue-100 text-blue-600" />,
      label: 'Bảng feed',
      href: '/feeds',
    },
    {
      id: 'events',
      icon: <Calendar className="w-9 h-9 p-2 rounded-full bg-red-100 text-red-600" />,
      label: 'Sự kiện',
      href: '/events',
    },
  ];

  return (
    <aside
      className="fixed left-0 top-14 w-72 h-[calc(100vh-56px)] bg-white border-r border-gray-200 overflow-y-auto z-30 sidebar-scrollbar"
    >
      <div className="p-2">
        {/* Menu Items */}
        <nav className="space-y-1" role="navigation" aria-label="Main navigation">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.href)}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left group cursor-pointer"
              aria-label={item.label}
            >
              {item.icon}
              <span className="font-medium text-sm text-gray-900 group-hover:text-gray-900">
                {item.label}
              </span>
            </button>
          ))}

          {/* See More */}
          <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
              <ChevronDown className="w-5 h-5 text-gray-700" />
            </div>
            <span className="font-medium text-sm text-gray-900">Xem thêm</span>
          </button>
        </nav>

        {/* Divider */}
        <div className="my-3 border-t border-gray-300"></div>

        {/* Your Shortcuts */}
        <div className="px-2 mb-2">
          <h3 className="text-sm font-semibold text-gray-600">Lối tắt của bạn</h3>
        </div>

        <nav className="space-y-1 mb-4">
          <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left cursor-pointer">
            <div className="w-9 h-9 rounded-lg bg-gray-300 flex items-center justify-center overflow-hidden">
              <Flag className="w-5 h-5 text-gray-600" />
            </div>
            <span className="font-medium text-sm text-gray-900">Nhóm React Developers</span>
          </button>
        </nav>

        {/* Footer Links */}
        <div className="px-2 pt-4 pb-6 text-xs text-gray-500 space-y-2">
          <div className="flex flex-wrap gap-1">
            <a href="#" className="hover:underline cursor-pointer">Quyền riêng tư</a>
            <span>·</span>
            <a href="#" className="hover:underline cursor-pointer">Điều khoản</a>
            <span>·</span>
            <a href="#" className="hover:underline cursor-pointer">Quảng cáo</a>
            <span>·</span>
            <a href="#" className="hover:underline cursor-pointer">Lựa chọn quảng cáo</a>
            <span>·</span>
            <a href="#" className="hover:underline cursor-pointer">Cookie</a>
            <span>·</span>
            <a href="#" className="hover:underline cursor-pointer">Xem thêm</a>
          </div>
          <div className="text-gray-500">
            KConnecta © 2025
          </div>
        </div>
      </div>
    </aside>
  );
};