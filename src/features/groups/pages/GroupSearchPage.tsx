import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GroupsHubLayout } from '../components';
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

  const joinedIds = new Set([...joinedGroups, ...managedGroups].map((g) => g.id));
  const [memberOverrides, setMemberOverrides] = useState<Map<string, boolean>>(new Map());
  const [pendingOverrides, setPendingOverrides] = useState<Set<string>>(new Set());

  const handleJoinToggle = (groupId: string) => {
    if (pendingOverrides.has(groupId)) return;

    const current =
      memberOverrides.get(groupId) ??
      groups.find((g) => g.id === groupId)?.isMember ??
      joinedIds.has(groupId);

    if (current) {
      navigate(`/groups/${groupId}`);
      return;
    }

    joinGroupMutation.mutate(groupId, {
      onSuccess: () => {
        setPendingOverrides((prev) => new Set(prev).add(groupId));
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

  const resultCards: SearchResultGroup[] = groups.map((g) => ({
    ...toSearchResultGroup(g),
    isMember: memberOverrides.get(g.id) ?? g.isMember ?? joinedIds.has(g.id),
    isPending: pendingOverrides.has(g.id),
  }));

  return (
    <GroupsHubLayout
      joinedGroups={joinedGroups}
      managedGroups={managedGroups}
      activeSectionId="search"
      initialSearchQuery={query}
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-full bg-blue-100 p-3">
          <Search className="h-6 w-6 text-blue-600" />
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
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <Search className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="text-[15px] text-gray-500 dark:text-gray-400">Dùng ô tìm kiếm bên trái hoặc gõ tên nhóm rồi nhấn Enter.</p>
        </div>
      )}

      {query.trim() && loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-500 dark:text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tìm kiếm...
        </div>
      )}

      {query.trim() && error && (
        <div className="rounded-xl border border-red-200 bg-white p-6 text-center text-sm text-red-600 dark:bg-gray-800">
          {error}
        </div>
      )}

      {query.trim() && !loading && !error && resultCards.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Không tìm thấy nhóm</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Thử từ khóa khác hoặc khám phá nhóm gợi ý.</p>
          <button
            type="button"
            onClick={() => navigate('/groups/discover')}
            className="font-semibold text-blue-600 hover:underline"
          >
            Khám phá nhóm
          </button>
        </div>
      )}

      {query.trim() && !loading && !error && resultCards.length > 0 && (
        <>
          <p className="mb-4 text-[15px] font-semibold text-gray-700 dark:text-gray-300">
            {resultCards.length} nhóm
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {resultCards.map((group) => (
              <GroupResult key={group.id} group={group} onJoinToggle={handleJoinToggle} />
            ))}
          </div>
        </>
      )}
    </GroupsHubLayout>
  );
}
