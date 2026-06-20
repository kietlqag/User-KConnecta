import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../../home/components/Header';
import { GroupsLeftSidebar } from '../components';
import { GroupResult } from '../../search/components/GroupResult/GroupResult';
import type { SearchResultGroup } from '../../search/types/search.types';
import { useJoinedGroups, useManagedGroups, useJoinGroup } from '../hooks/useGroups';
import { useGroupSearchResults } from '../hooks/useGroupSearch';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SearchGroupDto } from '@/services/searchService';

function toSearchResultGroup(g: SearchGroupDto): SearchResultGroup {
  return {
    id: g.id,
    type: 'group',
    name: g.name,
    coverImage: g.coverImage || 'https://placehold.co/400x200/e5e7eb/9ca3af?text=Nhóm',
    privacy: g.privacy,
    memberCount: g.memberCount,
    isMember: g.isMember,
  };
}

export function GroupSearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const { data: joinedGroups = [] } = useJoinedGroups();
  const { data: managedGroups = [] } = useManagedGroups();
  const { groups, loading, error } = useGroupSearchResults(query);
  const joinGroupMutation = useJoinGroup();

  const joinedIds = new Set([...joinedGroups, ...managedGroups].map(g => g.id));
  const [memberOverrides, setMemberOverrides] = useState<Map<string, boolean>>(new Map());
  const [pendingOverrides, setPendingOverrides] = useState<Set<string>>(new Set());

  const handleJoinToggle = (groupId: string) => {
    if (pendingOverrides.has(groupId)) return;

    const current =
      memberOverrides.get(groupId) ??
      groups.find(g => g.id === groupId)?.isMember ??
      joinedIds.has(groupId);

    if (current) {
      navigate(`/groups/${groupId}`);
      return;
    }

    joinGroupMutation.mutate(groupId, {
      onSuccess: () => {
        setPendingOverrides(prev => new Set(prev).add(groupId));
        toast.success('Đã gửi yêu cầu tham gia nhóm. Vui lòng chờ quản trị viên phê duyệt!');
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Không thể tham gia nhóm';
        toast.error(msg);
      },
    });
  };

  const resultCards: SearchResultGroup[] = groups.map(g => ({
    ...toSearchResultGroup(g),
    isMember: memberOverrides.get(g.id) ?? g.isMember ?? joinedIds.has(g.id),
    isPending: pendingOverrides.has(g.id),
  }));

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-background flex flex-col">
      <Header />

      <div className="flex flex-1 pt-14 h-full">
        <div className="sticky top-14 h-[calc(100vh-56px)] shrink-0 z-20 w-[360px]">
          <GroupsLeftSidebar
            joinedGroups={joinedGroups}
            managedGroups={managedGroups}
            activeSectionId="search"
            initialSearchQuery={query}
          />
        </div>

        <main className="flex-1 overflow-y-auto w-full p-6 md:p-8">
          <div className="max-w-[1000px] mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 rounded-full">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tìm kiếm nhóm</h1>
                <p className="text-gray-500 dark:text-gray-400">
                  {query.trim()
                    ? <>Kết quả cho &quot;<span className="font-medium text-gray-700 dark:text-gray-300">{query}</span>&quot;</>
                    : 'Nhập tên nhóm để bắt đầu tìm kiếm'}
                </p>
              </div>
            </div>

            {!query.trim() && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-[15px]">Dùng ô tìm kiếm bên trái hoặc gõ tên nhóm rồi nhấn Enter.</p>
              </div>
            )}

            {query.trim() && loading && (
              <div className="flex items-center justify-center gap-2 py-16 text-gray-500 dark:text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                Đang tìm kiếm...
              </div>
            )}

            {query.trim() && error && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 p-6 text-center text-red-600 text-sm">
                {error}
              </div>
            )}

            {query.trim() && !loading && !error && resultCards.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Không tìm thấy nhóm</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Thử từ khóa khác hoặc khám phá nhóm gợi ý.</p>
                <button
                  type="button"
                  onClick={() => navigate('/groups/discover')}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Khám phá nhóm
                </button>
              </div>
            )}

            {query.trim() && !loading && !error && resultCards.length > 0 && (
              <>
                <p className="text-[15px] font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  {resultCards.length} nhóm
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resultCards.map(group => (
                    <GroupResult key={group.id} group={group} onJoinToggle={handleJoinToggle} />
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
