import { useState } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import {
  GroupScopeFilter,
  PeopleRelationFilter,
  SearchFilterType,
  SortType,
} from '../../types/search.types';

interface SearchRightPanelProps {
  activeFilter: SearchFilterType;
  peopleFilter: PeopleRelationFilter;
  onPeopleFilterChange: (filter: PeopleRelationFilter) => void;
  groupFilter: GroupScopeFilter;
  onGroupFilterChange: (filter: GroupScopeFilter) => void;
  sortType: SortType;
  onSortChange: (sort: SortType) => void;
  dateFilter: string;
  onDateFilterChange: (date: string) => void;
}

const dateOptions = [
  { value: 'any', label: 'Bất kỳ lúc nào' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'year', label: 'Năm nay' },
];

export function SearchRightPanel({
  activeFilter,
  peopleFilter,
  onPeopleFilterChange,
  groupFilter,
  onGroupFilterChange,
  sortType,
  onSortChange,
  dateFilter,
  onDateFilterChange,
}: SearchRightPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(true);

  const showPostFilters = activeFilter === 'all' || activeFilter === 'posts';
  const showPeopleFilters = activeFilter === 'people';
  const showGroupFilters = activeFilter === 'groups';

  if (!showPostFilters && !showPeopleFilters && !showGroupFilters) {
    return null;
  }

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 self-start overflow-y-auto border-l border-border bg-card p-4 lg:block">
      <div className="space-y-4">
        {showPostFilters && (
          <div className="rounded-xl border border-border bg-muted/80 p-4/40">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2 text-foreground">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="text-sm font-semibold">Bộ lọc nâng cao</span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-5">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sắp xếp theo
                  </p>
                  <div className="space-y-1">
                    {[
                      { value: 'relevance' as SortType, label: 'Liên quan nhất' },
                      { value: 'latest' as SortType, label: 'Mới nhất' },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-card"
                      >
                        <input
                          type="radio"
                          name="sort"
                          value={option.value}
                          checked={sortType === option.value}
                          onChange={() => onSortChange(option.value)}
                          className="accent-emerald-600"
                        />
                        <span className="text-sm text-foreground">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Thời gian đăng
                  </p>
                  <div className="space-y-1">
                    {dateOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-card"
                      >
                        <input
                          type="radio"
                          name="date"
                          value={option.value}
                          checked={dateFilter === option.value}
                          onChange={() => onDateFilterChange(option.value)}
                          className="accent-emerald-600"
                        />
                        <span className="text-sm text-foreground">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {showPeopleFilters && (
          <div className="rounded-xl border border-border bg-muted/80 p-4/40">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Lọc mọi người
            </p>
            <div className="space-y-1">
              {[
                { label: 'Bạn bè', value: 'friends' as PeopleRelationFilter },
                { label: 'Bạn của bạn bè', value: 'friends_of_friends' as PeopleRelationFilter },
                { label: 'Tất cả mọi người', value: 'everyone' as PeopleRelationFilter },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-card"
                >
                  <input
                    type="radio"
                    name="people_filter"
                    value={opt.value}
                    checked={peopleFilter === opt.value}
                    onChange={() => onPeopleFilterChange(opt.value)}
                    className="accent-emerald-600"
                  />
                  <span className="text-sm text-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {showGroupFilters && (
          <div className="rounded-xl border border-border bg-muted/80 p-4/40">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Lọc nhóm
            </p>
            <div className="space-y-1">
              {[
                { label: 'Tất cả nhóm', value: 'all' as GroupScopeFilter },
                { label: 'Nhóm đã tham gia', value: 'joined' as GroupScopeFilter },
                { label: 'Nhóm công khai', value: 'public' as GroupScopeFilter },
                { label: 'Nhóm riêng tư', value: 'private' as GroupScopeFilter },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-card"
                >
                  <input
                    type="radio"
                    name="group_filter"
                    value={opt.value}
                    checked={groupFilter === opt.value}
                    onChange={() => onGroupFilterChange(opt.value)}
                    className="accent-emerald-600"
                  />
                  <span className="text-sm text-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
