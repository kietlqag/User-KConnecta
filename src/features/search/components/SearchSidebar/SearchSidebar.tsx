import { Globe, FileText, Users, Video, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { SearchFilterType, SortType } from '../../types/search.types';

interface SearchSidebarProps {
  activeFilter: SearchFilterType;
  onFilterChange: (filter: SearchFilterType) => void;
  sortType?: SortType;
  onSortChange?: (sort: SortType) => void;
  dateFilter?: string;
  onDateFilterChange?: (date: string) => void;
}

const filterOptions = [
  { id: 'all' as SearchFilterType, label: 'Tất cả', icon: Globe },
  { id: 'posts' as SearchFilterType, label: 'Bài viết', icon: FileText },
  { id: 'people' as SearchFilterType, label: 'Mọi người', icon: Users },
  { id: 'reels' as SearchFilterType, label: 'Thước phim', icon: Video },
  { id: 'groups' as SearchFilterType, label: 'Nhóm', icon: Users },
];

const dateOptions = [
  { value: 'any', label: 'Bất kỳ lúc nào' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'year', label: 'Năm nay' },
];

export const SearchSidebar = ({
  activeFilter,
  onFilterChange,
  sortType = 'relevance',
  onSortChange,
  dateFilter = 'any',
  onDateFilterChange,
}: SearchSidebarProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-4 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
      {/* Header */}
      <h2 className="text-xl font-bold mb-4">Kết quả tìm kiếm</h2>

      {/* Filter Menu */}
      <div className="space-y-1 mb-4">
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
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors cursor-pointer ${
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

      {/* Advanced Filters (shown for all/posts tabs) */}
      {(activeFilter === 'all' || activeFilter === 'posts') && onSortChange && onDateFilterChange && (
        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-gray-700">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="font-semibold text-sm">Bộ lọc nâng cao</span>
            </div>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-4 px-2">
              {/* Sort */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Sắp xếp theo
                </p>
                <div className="space-y-1">
                  {[
                    { value: 'relevance' as SortType, label: 'Liên quan nhất' },
                    { value: 'latest' as SortType, label: 'Mới nhất' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="sort"
                        value={option.value}
                        checked={sortType === option.value}
                        onChange={() => onSortChange(option.value)}
                        className="accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Filter */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Thời gian đăng
                </p>
                <div className="space-y-1">
                  {dateOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="date"
                        value={option.value}
                        checked={dateFilter === option.value}
                        onChange={() => onDateFilterChange(option.value)}
                        className="accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* People-specific filters */}
      {activeFilter === 'people' && (
        <div className="border-t border-gray-100 pt-4 px-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Lọc mọi người
          </p>
          <div className="space-y-2">
            {[
              { label: 'Bạn bè', value: 'friends' },
              { label: 'Bạn của bạn bè', value: 'friends_of_friends' },
              { label: 'Tất cả mọi người', value: 'everyone' },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1.5">
                <input type="radio" name="people_filter" value={opt.value} defaultChecked={opt.value === 'everyone'} className="accent-blue-600" />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Groups-specific filters */}
      {activeFilter === 'groups' && (
        <div className="border-t border-gray-100 pt-4 px-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Lọc nhóm
          </p>
          <div className="space-y-2">
            {[
              { label: 'Tất cả nhóm', value: 'all' },
              { label: 'Nhóm đã tham gia', value: 'joined' },
              { label: 'Nhóm công khai', value: 'public' },
              { label: 'Nhóm riêng tư', value: 'private' },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1.5">
                <input type="radio" name="group_filter" value={opt.value} defaultChecked={opt.value === 'all'} className="accent-blue-600" />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
