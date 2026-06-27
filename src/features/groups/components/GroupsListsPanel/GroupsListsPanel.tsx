import { useNavigate } from 'react-router-dom';
import type { Group } from '../../types/groups.types';

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

  const recentManaged = managedGroups.slice(0, managedLimit);
  const recentJoined = joinedGroups.slice(0, joinedLimit);

  return (
    <div className={className}>
      {managedGroups.length > 0 && (
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-[15px] font-semibold text-muted-foreground">
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
          <div className="space-y-1 overflow-hidden rounded-lg border border-border bg-muted p-1">
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
                  <h4 className="truncate pt-0.5 text-[15px] font-semibold text-foreground transition-colors group-hover:text-emerald-600">
                    {group.name}
                  </h4>
                  {group.lastActivity && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{group.lastActivity}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground">Nhóm bạn đã tham gia</h3>
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
            <p className="px-1 py-2 text-sm text-muted-foreground">Chưa tham gia nhóm nào.</p>
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
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground dark:text-muted-foreground">
                    {group.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1 text-left">
                  <h4 className="truncate font-medium text-foreground transition-colors group-hover:text-emerald-600">
                    {group.name}
                  </h4>
                  {group.lastActivity && (
                    <p className="truncate text-xs text-muted-foreground">{group.lastActivity}</p>
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
