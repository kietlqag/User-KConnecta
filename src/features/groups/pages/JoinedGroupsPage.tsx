import { useState } from 'react';
import { GroupsHubLayout, GroupListCard, GroupsSortDropdown } from '../components';
import { useJoinedGroups, useManagedGroups } from '../hooks/useGroups';
import { DEFAULT_GROUP_SORT, type GroupSortKey } from '../utils/groupSort';

export const JoinedGroupsPage = () => {
  const [sortKey, setSortKey] = useState<GroupSortKey>(DEFAULT_GROUP_SORT);
  const { data: joinedGroups = [], isLoading: loadingJoined } = useJoinedGroups(sortKey);
  const { data: sidebarJoinedGroups = [] } = useJoinedGroups();
  const { data: managedGroups = [] } = useManagedGroups();

  return (
    <GroupsHubLayout
      joinedGroups={sidebarJoinedGroups}
      managedGroups={managedGroups}
      activeSectionId="your-groups"
      contentMaxWidthClass="max-w-[920px]"
    >
      <div className="flex h-[calc(100vh-88px)] flex-col">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h1 className="text-[17px] font-semibold text-foreground">
            {loadingJoined ? 'Đang tải...' : `Tất cả các nhóm bạn đã tham gia (${joinedGroups.length})`}
          </h1>
          {!loadingJoined && joinedGroups.length > 0 && (
            <GroupsSortDropdown value={sortKey} onChange={setSortKey} />
          )}
        </div>

        <div className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
          {loadingJoined ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[250px] animate-pulse rounded-lg border border-border bg-card" />
              ))}
            </div>
          ) : joinedGroups.length === 0 ? (
            <p className="text-[15px] text-muted-foreground">Bạn chưa tham gia nhóm nào.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {joinedGroups.map((group) => (
                <GroupListCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </div>
      </div>
    </GroupsHubLayout>
  );
};
