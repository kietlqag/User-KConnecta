import { Globe, FileText, Users, Video, Store, Flag, Calendar, Info } from 'lucide-react';
import { SearchFilterType } from '../../types/search.types';

interface SearchSidebarProps {
  activeFilter: SearchFilterType;
  onFilterChange: (filter: SearchFilterType) => void;
}

const filterOptions = [
  { id: 'all' as SearchFilterType, label: 'Tất cả', icon: Globe },
  { id: 'posts' as SearchFilterType, label: 'Bài viết', icon: FileText },
  { id: 'people' as SearchFilterType, label: 'Mọi người', icon: Users },
  { id: 'reels' as SearchFilterType, label: 'Thước phim', icon: Video },
  { id: 'marketplace' as SearchFilterType, label: 'Marketplace', icon: Store },
  { id: 'pages' as SearchFilterType, label: 'Trang', icon: Flag },
  { id: 'groups' as SearchFilterType, label: 'Nhóm', icon: Users },
  { id: 'events' as SearchFilterType, label: 'Sự kiện', icon: Calendar },
];

export const SearchSidebar = ({ activeFilter, onFilterChange }: SearchSidebarProps) => {
  return (
    <div className="w-80 bg-white border-r border-gray-200 p-4 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
      {/* Header */}
      <h2 className="text-xl font-bold mb-4">Kết quả tìm kiếm</h2>

      {/* Filter Menu */}
      <div className="space-y-1">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 mb-2">
          Bộ lọc
        </h3>
        {filterOptions.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.id;
          
          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                isActive ? 'bg-blue-100' : 'bg-gray-200'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="font-medium text-sm">{filter.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
