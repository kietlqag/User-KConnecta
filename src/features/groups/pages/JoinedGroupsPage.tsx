import { useNavigate } from 'react-router-dom';
import { GroupsHubLayout } from '../components';
import { MoreHorizontal } from 'lucide-react';
import { useJoinedGroups, useManagedGroups } from '../hooks/useGroups';

export const JoinedGroupsPage = () => {
  const navigate = useNavigate();
  const { data: joinedGroups = [], isLoading: loadingJoined } = useJoinedGroups();
  const { data: managedGroups = [] } = useManagedGroups();

  return (
    <GroupsHubLayout
      joinedGroups={joinedGroups}
      managedGroups={managedGroups}
      activeSectionId="your-groups"
    >
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-[17px] font-semibold text-gray-900 dark:text-gray-100">
          {loadingJoined ? 'Đang tải...' : `Tất cả các nhóm bạn đã tham gia (${joinedGroups.length})`}
        </h1>
        <button type="button" className="cursor-pointer text-[15px] font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
          Sắp xếp
        </button>
      </div>

      {loadingJoined ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[200px] animate-pulse rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
          ))}
        </div>
      ) : joinedGroups.length === 0 ? (
        <p className="text-[15px] text-gray-500 dark:text-gray-400">Bạn chưa tham gia nhóm nào.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {joinedGroups.map((group) => (
            <div
              key={group.id}
              className="flex h-[200px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:shadow-none"
            >
              <div className="flex flex-1 gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
                {group.icon ? (
                  <img
                    src={group.icon}
                    alt={group.name}
                    className="h-[84px] w-[84px] shrink-0 rounded-xl border border-gray-100 object-cover dark:border-gray-800"
                  />
                ) : (
                  <div className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-xl bg-gray-200 text-2xl font-bold text-gray-400 dark:bg-gray-700">
                    {group.name.charAt(0)}
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <h3
                    onClick={() => navigate(`/groups/${group.id}`)}
                    className="line-clamp-2 cursor-pointer text-[15px] font-semibold leading-tight text-gray-900 hover:underline dark:text-gray-100"
                  >
                    {group.name}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-snug text-gray-500 dark:text-gray-400">
                    {group.lastActivity}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white p-3 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="flex-1 cursor-pointer rounded-md bg-emerald-50 py-1.5 text-[15px] font-semibold text-emerald-600 transition-colors hover:bg-emerald-100"
                >
                  Xem nhóm
                </button>
                <button type="button" className="shrink-0 cursor-pointer rounded-md bg-gray-100 p-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-700">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </GroupsHubLayout>
  );
};
