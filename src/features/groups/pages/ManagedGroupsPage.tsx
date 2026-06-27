import { useMemo, useState } from 'react';
import { GroupsHubLayout, GroupListCard, GroupsSortDropdown } from '../components';
import { useJoinedGroups, useManagedGroups } from '../hooks/useGroups';
import { DEFAULT_GROUP_SORT, sortGroups, type GroupSortKey } from '../utils/groupSort';

export const ManagedGroupsPage = () => {
  const { data: managedGroups = [], isLoading: loadingManaged } = useManagedGroups();
  const { data: joinedGroups = [] } = useJoinedGroups();
  const [sortKey, setSortKey] = useState<GroupSortKey>(DEFAULT_GROUP_SORT);

  const sortedGroups = useMemo(() => sortGroups(managedGroups, sortKey), [managedGroups, sortKey]);

  return (
    <GroupsHubLayout
      joinedGroups={joinedGroups}
      managedGroups={managedGroups}
      activeSectionId="your-groups"
      contentMaxWidthClass="max-w-[920px]"
    >
      <div className="flex h-[calc(100vh-88px)] flex-col">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-gray-100">
            {loadingManaged ? 'Đang tải...' : `Tất cả nhóm bạn quản lý (${managedGroups.length})`}
          </h1>
          {!loadingManaged && managedGroups.length > 0 && (
            <GroupsSortDropdown value={sortKey} onChange={setSortKey} />
          )}
        </div>

        <div className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
          {loadingManaged ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[250px] animate-pulse rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
              ))}
            </div>
          ) : managedGroups.length === 0 ? (
            <p className="text-[15px] text-gray-500 dark:text-gray-400">Bạn chưa quản lý nhóm nào.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sortedGroups.map((group) => (
                <GroupListCard key={group.id} group={group} placeholderVariant="emerald" />
              ))}
            </div>
          )}
        </div>
      </div>
    </GroupsHubLayout>
  );
};
