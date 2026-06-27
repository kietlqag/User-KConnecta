import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Group } from '../../types/groups.types';
import { sortGroups } from '../../utils/groupSort';

interface GroupsListsPanelProps {
  joinedGroups: Group[];
  managedGroups?: Group[];
  joinedLimit?: number;
  managedLimit?: number;
  className?: string;
}

export function GroupsListsPanel({
  joinedGroups,
  managedGroups = [],
  joinedLimit = 5,
  managedLimit = 5,
  className = '',
}: GroupsListsPanelProps) {
  const navigate = useNavigate();

  const recentManaged = useMemo(
    () => sortGroups(managedGroups, 'recent').slice(0, managedLimit),
    [managedGroups, managedLimit],
  );

  const recentJoined = useMemo(
    () => sortGroups(joinedGroups, 'recent').slice(0, joinedLimit),
    [joinedGroups, joinedLimit],
  );

  return (
    <div className={className}>
      {managedGroups.length > 0 && (
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-[15px] font-semibold text-gray-600 dark:text-gray-400">
              Nhóm do bạn quản lý
            </h3>
            <button
              type="button"
              onClick={() => navigate('/groups/managed')}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              Xem tất cả
            </button>
          </div>
          <div className="space-y-1 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900">
            {recentManaged.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => navigate(`/groups/${group.id}`)}
                className="group flex w-full items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
              >
                {group.icon ? (
                  <img src={group.icon} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700">
                    {group.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1 text-left">
                  <h4 className="truncate pt-0.5 text-[15px] font-semibold text-gray-900 transition-colors group-hover:text-emerald-600 dark:text-gray-100">
                    {group.name}
                  </h4>
                  {group.lastActivity && (
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{group.lastActivity}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Nhóm bạn đã tham gia</h3>
          <button
            type="button"
            onClick={() => navigate('/groups/joined')}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Xem tất cả
          </button>
        </div>

        <div className="space-y-1">
          {recentJoined.length === 0 ? (
            <p className="px-1 py-2 text-sm text-gray-400">Chưa tham gia nhóm nào.</p>
          ) : (
            recentJoined.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => navigate(`/groups/${group.id}`)}
                className="group flex w-full items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted"
              >
                {group.icon ? (
                  <img src={group.icon} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-sm font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    {group.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1 text-left">
                  <h4 className="truncate font-medium text-gray-900 transition-colors group-hover:text-emerald-600 dark:text-gray-100">
                    {group.name}
                  </h4>
                  {group.lastActivity && (
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{group.lastActivity}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
