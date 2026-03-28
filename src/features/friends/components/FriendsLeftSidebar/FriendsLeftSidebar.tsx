import { Users, UserPlus, Sparkles, Cake, List, Settings } from 'lucide-react';
import { FriendsSidebarItem } from '../../types/friends.types';

const sidebarItems: FriendsSidebarItem[] = [
  { id: 'home', label: 'Trang chủ', icon: <Users className="w-5 h-5" /> },
  { id: 'requests', label: 'Lời mời kết bạn', icon: <UserPlus className="w-5 h-5" />, count: 12 },
  { id: 'suggestions', label: 'Gợi ý', icon: <Sparkles className="w-5 h-5" /> },
  { id: 'all-friends', label: 'Tất cả bạn bè', icon: <Users className="w-5 h-5" /> },
  { id: 'birthdays', label: 'Sinh nhật', icon: <Cake className="w-5 h-5" /> },
  { id: 'custom-lists', label: 'Danh sách tùy chỉnh', icon: <List className="w-5 h-5" /> },
];

export const FriendsLeftSidebar = () => {
  return (
    <div className="w-[360px] bg-white border-r border-gray-200 min-h-[calc(100vh-56px)] sticky top-14 overflow-y-auto sidebar-scrollbar">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Bạn bè</h1>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="text-gray-600 group-hover:text-emerald-600 transition-colors">
                  {item.icon}
                </div>
                <span className="font-medium text-gray-900">{item.label}</span>
              </div>
              {item.count && (
                <span className="bg-emerald-500 text-white text-sm font-semibold px-2.5 py-0.5 rounded-full">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};