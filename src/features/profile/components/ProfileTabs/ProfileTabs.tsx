import { Link, useLocation } from 'react-router@7.1.3';
import { ChevronDown, MoreHorizontal } from 'lucide-react';

interface ProfileTabsProps {
  username: string;
}

export function ProfileTabs({ username }: ProfileTabsProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    { label: 'Tất cả', path: `/profile/${username}` },
    { label: 'Giới thiệu', path: `/profile/${username}/about` },
    { label: 'Bạn bè', path: `/profile/${username}/friends` },
    { label: 'Ảnh', path: `/profile/${username}/photos` },
    { label: 'Video', path: `/profile/${username}/videos` },
  ];

  const isActive = (path: string) => {
    if (path === `/profile/${username}`) {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-14 z-40">
      <div className="max-w-[1100px] mx-auto px-4">
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-2 -mb-px overflow-x-auto scrollbar-none">
            {tabs.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={`px-4 py-4 font-medium transition-colors whitespace-nowrap ${
                  isActive(tab.path)
                    ? 'text-emerald-600 border-b-4 border-emerald-600'
                    : 'text-gray-600 hover:bg-gray-100 rounded-t-lg'
                }`}
              >
                {tab.label}
              </Link>
            ))}
            
            <button className="flex items-center gap-2 px-4 py-4 text-gray-600 hover:bg-gray-100 rounded-t-lg transition-colors font-medium">
              Xem thêm
              <ChevronDown className="w-4 h-4" />
            </button>
          </nav>

          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
            <MoreHorizontal className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}