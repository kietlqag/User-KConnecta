import { useNavigate } from 'react-router-dom';
import { GroupsHubLayout } from '../components';
import { Compass } from 'lucide-react';
import { useDiscoverGroups, useJoinedGroups, useManagedGroups, useJoinGroup } from '../hooks/useGroups';
import { toast } from 'sonner';

export const DiscoverGroupsPage = () => {
  const navigate = useNavigate();
  const { data: discoverGroups = [], isLoading: loadingDiscover } = useDiscoverGroups();
  const { data: joinedGroups = [] } = useJoinedGroups();
  const { data: managedGroups = [] } = useManagedGroups();
  const joinGroupMutation = useJoinGroup();

  const handleJoinGroup = (groupId: string) => {
    joinGroupMutation.mutate(groupId, {
      onSuccess: () => {
        toast.success('Đã gửi yêu cầu tham gia nhóm. Vui lòng chờ quản trị viên phê duyệt!');
      },
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Không thể tham gia nhóm. Vui lòng thử lại.';
        toast.error(message);
      },
    });
  };

  return (
    <GroupsHubLayout
      joinedGroups={joinedGroups}
      managedGroups={managedGroups}
      activeSectionId="discover"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-full bg-blue-100 p-3">
          <Compass className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Khám phá nhóm</h1>
          <p className="text-gray-500 dark:text-gray-400">Tìm kiếm các cộng đồng mới mà bạn có thể quan tâm.</p>
        </div>
      </div>

      <h2 className="mb-4 text-[17px] font-semibold text-gray-900 dark:text-gray-100">
        {loadingDiscover ? 'Đang tải các nhóm gợi ý...' : `Gợi ý cho bạn (${discoverGroups.length})`}
      </h2>

      {loadingDiscover ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[280px] animate-pulse rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
          ))}
        </div>
      ) : discoverGroups.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <Compass className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Không tìm thấy nhóm mới</h3>
          <p className="text-gray-500 dark:text-gray-400">Có vẻ như bạn đã tham gia tất cả các nhóm hiện có!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {discoverGroups.map((group) => (
            <div
              key={group.id}
              className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:shadow-none"
            >
              <div className="relative h-32 overflow-hidden bg-gray-200 dark:bg-gray-700">
                {group.icon ? (
                  <img
                    src={group.icon}
                    alt={group.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-400 to-indigo-600 text-4xl font-bold text-white opacity-80">
                    {group.name.charAt(0)}
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <h3 className="mb-1 line-clamp-2 text-[17px] font-bold leading-tight text-gray-900 transition-colors group-hover:text-blue-600 dark:text-gray-100">
                  {group.name}
                </h3>
                <div className="mb-3 flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400">
                  <span>{group.privacy === 'public' ? 'Nhóm công khai' : 'Nhóm riêng tư'}</span>
                  <span>·</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{group.members} thành viên</span>
                </div>

                <div className="mt-auto space-y-2">
                  <button
                    type="button"
                    onClick={() => handleJoinGroup(group.id)}
                    disabled={joinGroupMutation.isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-70"
                  >
                    {joinGroupMutation.isPending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : null}
                    Tham gia nhóm
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/groups/${group.id}`)}
                    className="w-full rounded-lg bg-gray-100 py-2 text-[15px] font-semibold text-gray-900 transition-colors hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    Xem thông tin
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </GroupsHubLayout>
  );
};
