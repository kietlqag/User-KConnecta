import type { Group } from '../types/groups.types';

export type GroupSortKey =
  | 'recent'
  | 'name-asc'
  | 'name-desc'
  | 'members-desc'
  | 'members-asc';

export interface GroupSortOption {
  key: GroupSortKey;
  label: string;
}

/**
 * Sort keys shared with the groups list API (`?sort=`).
 * `sortGroups` remains available for local reordering when needed.
 */
export const GROUP_SORT_OPTIONS: GroupSortOption[] = [
  { key: 'recent', label: 'Hoạt động gần đây nhất' },
  { key: 'name-asc', label: 'Tên (A → Z)' },
  { key: 'name-desc', label: 'Tên (Z → A)' },
  { key: 'members-desc', label: 'Thành viên nhiều nhất' },
  { key: 'members-asc', label: 'Thành viên ít nhất' },
];

export const DEFAULT_GROUP_SORT: GroupSortKey = 'recent';

function activityTime(group: Group): number {
  return group.updatedAt ? new Date(group.updatedAt).getTime() : 0;
}

export function sortGroups(groups: Group[], sortKey: GroupSortKey): Group[] {
  const sorted = [...groups];
  switch (sortKey) {
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name, 'vi'));
    case 'members-desc':
      return sorted.sort((a, b) => b.members - a.members);
    case 'members-asc':
      return sorted.sort((a, b) => a.members - b.members);
    case 'recent':
    default:
      return sorted.sort((a, b) => activityTime(b) - activityTime(a));
  }
}
