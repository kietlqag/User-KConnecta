import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../home/components/Header';
import { GroupsLeftSidebar } from '../components';
import { MoreHorizontal, Compass } from 'lucide-react';
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
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Không thể tham gia nhóm. Vui lòng thử lại.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />

      <div className="flex flex-1 pt-14 h-full">
        {/* Left Sidebar */}
        <div className="sticky top-14 h-[calc(100vh-56px)] shrink-0 z-10 w-[360px]">
          <GroupsLeftSidebar
            joinedGroups={joinedGroups}
            managedGroups={managedGroups}
            activeSectionId="discover"
          />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full p-8 px-12">
          <div className="max-w-[1000px]">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 rounded-full">
                <Compass className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Khám phá nhóm</h1>
                <p className="text-gray-500">Tìm kiếm các cộng đồng mới mà bạn có thể quan tâm.</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-semibold text-gray-900">
                {loadingDiscover
                  ? 'Đang tải các nhóm gợi ý...'
                  : `Gợi ý cho bạn (${discoverGroups.length})`}
              </h2>
            </div>

            {loadingDiscover ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg border border-gray-200 h-[280px] animate-pulse" />
                ))}
              </div>
            ) : discoverGroups.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                <Compass className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Không tìm thấy nhóm mới</h3>
                <p className="text-gray-500">Có vẻ như bạn đã tham gia tất cả các nhóm hiện có!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {discoverGroups.map(group => (
                  <div
                    key={group.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-all duration-200 group"
                  >
                    {/* Cover Photo or Placeholder */}
                    <div className="h-32 bg-gray-200 relative overflow-hidden">
                      {group.icon ? (
                        <img
                          src={group.icon}
                          alt={group.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold opacity-80">
                          {group.name.charAt(0)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-bold text-gray-900 text-[17px] leading-tight line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
                        {group.name}
                      </h3>
                      <div className="flex items-center text-[13px] text-gray-500 gap-1.5 mb-3">
                        <span>{group.privacy === 'public' ? 'Nhóm công khai' : 'Nhóm riêng tư'}</span>
                        <span>·</span>
                        <span className="font-medium text-gray-700">{group.members} thành viên</span>
                      </div>
                      
                      <div className="mt-auto space-y-2">
                        <button
                          onClick={() => handleJoinGroup(group.id)}
                          disabled={joinGroupMutation.isPending}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-semibold py-2 rounded-lg transition-colors text-[15px] flex items-center justify-center gap-2"
                        >
                          {joinGroupMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : null}
                          Tham gia nhóm
                        </button>
                        <button
                          onClick={() => navigate(`/groups/${group.id}`)}
                          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-2 rounded-lg transition-colors text-[15px]"
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
        </main>
      </div>
    </div>
  );
};
