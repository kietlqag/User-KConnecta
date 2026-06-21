import type { Group } from '../../types/groups.types';
import { GroupsListsPanel } from '../GroupsListsPanel';

interface GroupsRightSidebarProps {
  joinedGroups: Group[];
  managedGroups?: Group[];
}

export function GroupsRightSidebar({ joinedGroups, managedGroups = [] }: GroupsRightSidebarProps) {
  return (
    <aside className="sidebar-scrollbar h-full w-full overflow-y-auto border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="p-4">
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Nhóm của bạn</h2>
        <GroupsListsPanel joinedGroups={joinedGroups} managedGroups={managedGroups} joinedLimit={10} />
      </div>
    </aside>
  );
}
