import type { Group } from '../../types/groups.types';
import { GroupsListsPanel } from '../GroupsListsPanel';

interface GroupsRightSidebarProps {
  joinedGroups: Group[];
  managedGroups?: Group[];
}

export function GroupsRightSidebar({ joinedGroups, managedGroups = [] }: GroupsRightSidebarProps) {
  return (
    <aside className="sidebar-scrollbar h-full w-full overflow-y-auto border-l border-border bg-card">
      <div className="p-4">
        <h2 className="mb-4 text-lg font-bold text-foreground">Nhóm của bạn</h2>
        <GroupsListsPanel joinedGroups={joinedGroups} managedGroups={managedGroups} />
      </div>
    </aside>
  );
}
