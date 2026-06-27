import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GroupsHubLayout, GroupsSortDropdown } from '../components';
import { Compass } from 'lucide-react';
import { useDiscoverGroups, useJoinedGroups, useManagedGroups, useJoinGroup } from '../hooks/useGroups';
import { DEFAULT_GROUP_SORT, type GroupSortKey } from '../utils/groupSort';
import { toast } from 'sonner';

export const DiscoverGroupsPage = () => {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<GroupSortKey>(DEFAULT_GROUP_SORT);
  const { data: discoverGroups = [], isLoading: loadingDiscover } = useDiscoverGroups(sortKey);
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
      contentMaxWidthClass="max-w-[920px]"
    >
      <div className="flex h-[calc(100vh-88px)] flex-col">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h1 className="text-[17px] font-semibold text-foreground">
            {loadingDiscover ? 'Đang tải các nhóm gợi ý...' : `Gợi ý cho bạn (${discoverGroups.length})`}
          </h1>
          {!loadingDiscover && discoverGroups.length > 0 && (
            <GroupsSortDropdown value={sortKey} onChange={setSortKey} />
          )}
        </div>

        <div className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
          {loadingDiscover ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[280px] animate-pulse rounded-lg border border-border bg-card" />
              ))}
            </div>
          ) : discoverGroups.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Compass className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold text-foreground">Không tìm thấy nhóm mới</h3>
              <p className="text-muted-foreground">Có vẻ như bạn đã tham gia tất cả các nhóm hiện có!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {discoverGroups.map((group) => (
                <div
                  key={group.id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md dark:shadow-none"
                >
                  <div className="relative h-32 overflow-hidden bg-muted">
                    {group.icon ? (
                      <img
                        src={group.icon}
                        alt={group.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 text-4xl font-bold text-white opacity-80">
                        {group.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="mb-1 line-clamp-2 text-[17px] font-bold leading-tight text-foreground transition-colors group-hover:text-emerald-600">
                      {group.name}
                    </h3>
                    <div className="mb-3 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                      <span>{group.privacy === 'public' ? 'Nhóm công khai' : 'Nhóm riêng tư'}</span>
                      <span>·</span>
                      <span className="font-medium text-foreground">{group.members} thành viên</span>
                    </div>

                    <div className="mt-auto space-y-2">
                      <button
                        type="button"
                        onClick={() => handleJoinGroup(group.id)}
                        disabled={joinGroupMutation.isPending}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-[15px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-70"
                      >
                        {joinGroupMutation.isPending ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : null}
                        Tham gia nhóm
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/groups/${group.id}`)}
                        className="w-full rounded-lg bg-muted py-2 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted"
                      >
                        Xem thông tin
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GroupsHubLayout>
  );
};
