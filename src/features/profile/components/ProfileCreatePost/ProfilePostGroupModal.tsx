import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Users, Check } from 'lucide-react';
import { groupService, type GroupApiResponse } from '@/services/groupService';
import { authService } from '@/services/authService';

interface ProfilePostGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGroupId: string | null;
  onSelect: (groupId: string | null, groupName: string | null) => void;
}

export function ProfilePostGroupModal({
  isOpen,
  onClose,
  selectedGroupId,
  onSelect,
}: ProfilePostGroupModalProps) {
  const [groups, setGroups] = useState<GroupApiResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      return;
    }
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setLoading(true);
      groupService.getJoinedGroups(currentUser.id)
        .then(setGroups)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-[500px] flex-col overflow-hidden rounded-lg bg-card shadow-xl">
        <div className="relative flex shrink-0 items-center border-b border-border bg-card p-4">
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          <h2 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-foreground">
            Chọn nhóm
          </h2>
        </div>

        <div className="shrink-0 border-b border-border p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm nhóm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full bg-muted py-2 pl-9 pr-4 text-sm outline-none dark:text-white dark:placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <button
            onClick={() => { onSelect(null, null); onClose(); }}
            className={`flex w-full items-center gap-3 rounded-lg p-3 transition-colors ${ selectedGroupId === null ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-muted' }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${ selectedGroupId === null ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-muted' }`}
            >
              <Users
                className={`h-5 w-5 ${ selectedGroupId === null ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground' }`}
              />
            </div>
            <span className="flex-1 text-left font-medium text-foreground">
              Chỉ tường cá nhân
            </span>
            {selectedGroupId === null && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </button>

          {loading && (
            <p className="py-6 text-center text-sm text-muted-foreground">Đang tải...</p>
          )}

          {!loading && groups.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Bạn chưa tham gia nhóm nào</p>
          )}

          {!loading && groups.length > 0 && filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Không tìm thấy nhóm
            </p>
          )}

          {filtered.map(group => {
            const isSelected = selectedGroupId === group.id;
            return (
              <button
                key={group.id}
                onClick={() => { onSelect(group.id, group.name); onClose(); }}
                className={`flex w-full items-center gap-3 rounded-lg p-3 transition-colors ${ isSelected ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-muted' }`}
              >
                {group.coverPhotoUrl ? (
                  <img
                    src={group.coverPhotoUrl}
                    alt={group.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${ isSelected ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-muted' }`}
                  >
                    <Users
                      className={`h-5 w-5 ${ isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground' }`}
                    />
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">{group.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.memberCount} thành viên · {group.privacy === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}
                  </p>
                </div>
                {isSelected && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
