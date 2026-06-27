import { Globe, FileText, Users, Video } from 'lucide-react';
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
  { id: 'groups' as SearchFilterType, label: 'Nhóm', icon: Users },
];

export const SearchSidebar = ({ activeFilter, onFilterChange }: SearchSidebarProps) => {
  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 self-start overflow-y-auto border-r border-border bg-card p-4 md:block">
      <h2 className="mb-4 text-lg font-bold">Kết quả tìm kiếm</h2>

      <div className="space-y-1">
        <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Bộ lọc
        </h3>
        {filterOptions.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.id;

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onFilterChange(filter.id)}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors ${ isActive ? 'bg-emerald-50 text-emerald-600' : 'text-foreground hover:bg-muted' }`}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full ${ isActive ? 'bg-emerald-100' : 'bg-muted' }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{filter.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
