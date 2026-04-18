import { Users, UserPlus, Sparkles, Cake, List, Settings } from 'lucide-react';

export type FriendsTab = 'home' | 'requests' | 'suggestions' | 'all-friends';

interface SidebarItem {
  id: FriendsTab;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

interface FriendsLeftSidebarProps {
  activeTab: FriendsTab;
  onTabChange: (tab: FriendsTab) => void;
  requestCount?: number;
}

export const FriendsLeftSidebar = ({ activeTab, onTabChange, requestCount }: FriendsLeftSidebarProps) => {
  const sidebarItems: SidebarItem[] = [
    { id: 'home', label: 'Trang chủ', icon: <Users className="w-5 h-5" /> },
    { id: 'requests', label: 'Lời mời kết bạn', icon: <UserPlus className="w-5 h-5" />, count: requestCount },
    { id: 'suggestions', label: 'Gợi ý', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'all-friends', label: 'Tất cả bạn bè', icon: <Users className="w-5 h-5" /> },
    { id: 'birthdays', label: 'Sinh nhật', icon: <Cake className="w-5 h-5" /> },
    { id: 'custom-lists', label: 'Danh sách tùy chỉnh', icon: <List className="w-5 h-5" /> },
  ];

  return (
    <div className="w-[360px] bg-white border-r border-gray-200 min-h-[calc(100vh-56px)] sticky top-14 overflow-y-auto sidebar-scrollbar">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Bạn bè</h1>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer group ${
                activeTab === item.id
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={activeTab === item.id ? 'text-emerald-600' : 'text-gray-600 group-hover:text-emerald-600 transition-colors'}>
                  {item.icon}
                </div>
                <span className={`font-medium ${activeTab === item.id ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {item.label}
                </span>
              </div>
              {item.count != null && item.count > 0 && (
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
