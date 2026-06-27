import { Loader2, Search, Users } from 'lucide-react';
import type { Group } from '../../types/groups.types';
import type { SearchGroupDto } from '@/services/searchService';

interface GroupSearchDropdownProps {
  query: string;
  loading: boolean;
  localGroups: Group[];
  suggestedGroups: SearchGroupDto[];
  onSelectLocal: (group: Group) => void;
  onSelectSuggested: (group: SearchGroupDto) => void;
  onViewAll: () => void;
}

export function GroupSearchDropdown({
  query,
  loading,
  localGroups,
  suggestedGroups,
  onSelectLocal,
  onSelectSuggested,
  onViewAll,
}: GroupSearchDropdownProps) {
  const hasLocal = localGroups.length > 0;
  const hasSuggested = suggestedGroups.length > 0;
  const empty = !loading && !hasLocal && !hasSuggested;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl shadow-xl border border-border z-50 overflow-hidden max-h-[min(420px,60vh)] flex flex-col">
      <div className="px-4 py-2.5 border-b border-border bg-background">
        <p className="text-xs font-medium text-muted-foreground">
          Kết quả cho &quot;{query}&quot;
        </p>
      </div>

      <div className="overflow-y-auto flex-1 py-1">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tìm...
          </div>
        )}

        {hasLocal && (
          <div className="px-2 pb-1">
            <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Nhóm của bạn
            </p>
            {localGroups.slice(0, 5).map(group => (
              <button
                key={group.id}
                type="button"
                onClick={() => onSelectLocal(group)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted transition-colors text-left"
              >
                {group.icon ? (
                  <img src={group.icon} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                )}
                <span className="font-medium text-[15px] text-foreground truncate">{group.name}</span>
              </button>
            ))}
          </div>
        )}

        {hasSuggested && (
          <div className="px-2 pb-1">
            <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Khám phá thêm
            </p>
            {suggestedGroups.map(group => (
              <button
                key={group.id}
                type="button"
                onClick={() => onSelectSuggested(group)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted transition-colors text-left"
              >
                {group.coverImage ? (
                  <img src={group.coverImage} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <span className="font-medium text-[15px] text-foreground truncate">{group.name}</span>
              </button>
            ))}
          </div>
        )}

        {empty && (
          <div className="px-4 py-8 text-center">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Không tìm thấy nhóm phù hợp</p>
          </div>
        )}
      </div>

      {query.trim() && (
        <button
          type="button"
          onClick={onViewAll}
          className="w-full px-4 py-3 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 border-t border-border transition-colors"
        >
          Xem tất cả kết quả
        </button>
      )}
    </div>
  );
}
