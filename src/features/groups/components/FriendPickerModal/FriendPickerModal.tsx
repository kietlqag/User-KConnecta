import React, { useEffect, useMemo, useState } from 'react';
import { Search, X, Check } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { useFriends } from '@/features/friends/hooks/useFriends';
import { authService } from '@/services/authService';

interface FriendPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUserIds: string[];
  onConfirm: (userIds: string[]) => void;
  title?: string;
  description?: string;
}

export const FriendPickerModal: React.FC<FriendPickerModalProps> = ({
  isOpen,
  onClose,
  selectedUserIds,
  onConfirm,
  title = 'Chọn bạn bè',
  description = 'Tìm và chọn bạn bè bạn muốn mời vào nhóm.',
}) => {
  const currentUser = authService.getCurrentUser();
  const { data: friends = [], isLoading } = useFriends(currentUser?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelected, setTempSelected] = useState<string[]>(selectedUserIds);

  useEffect(() => {
    if (!isOpen) return;
    setTempSelected(selectedUserIds);
    setSearchTerm('');
  }, [isOpen, selectedUserIds]);

  const filteredFriends = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return friends.filter((friend) => !q || friend.name.toLowerCase().includes(q));
  }, [friends, searchTerm]);

  const selectedFriends = useMemo(
    () => friends.filter((friend) => tempSelected.includes(friend.userId)),
    [friends, tempSelected],
  );

  if (!isOpen) return null;

  const toggleUserSelection = (userId: string) => {
    setTempSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleConfirm = () => {
    onConfirm(tempSelected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card w-full max-w-[680px] rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col h-[min(540px,90vh)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="w-8" />
          <h2 className="text-[20px] font-bold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {description && (
          <p className="px-6 pt-3 pb-1 text-sm text-muted-foreground shrink-0">{description}</p>
        )}

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="w-[60%] flex flex-col border-r border-border min-h-0">
            <div className="p-4 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm bạn bè theo tên"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background rounded-full text-[15px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Đang tải bạn bè...</div>
              ) : filteredFriends.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {friends.length === 0 ? 'Bạn chưa có bạn bè nào.' : 'Không tìm thấy bạn bè phù hợp.'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredFriends.map((friend) => {
                    const isSelected = tempSelected.includes(friend.userId);
                    return (
                      <button
                        key={friend.userId}
                        type="button"
                        onClick={() => toggleUserSelection(friend.userId)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer group text-left"
                      >
                        <UserAvatar
                          name={friend.name}
                          avatarUrl={friend.avatar}
                          userId={friend.userId}
                          rounded="full"
                          className="w-9 h-9 shrink-0"
                        />
                        <span className="flex-1 text-[15px] font-medium text-foreground truncate">
                          {friend.name}
                        </span>
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0 ${ isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-border group-hover:border-gray-400' }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="w-[40%] bg-background/50 flex flex-col min-h-0">
            <div className="px-4 py-4 border-b border-border bg-card shrink-0">
              <span className="text-[15px] font-semibold text-foreground">
                Đã chọn {tempSelected.length} người bạn
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {selectedFriends.map((friend) => (
                <div key={friend.userId} className="flex items-center gap-3">
                  <UserAvatar
                    name={friend.name}
                    avatarUrl={friend.avatar}
                    userId={friend.userId}
                    rounded="full"
                    className="w-8 h-8 shrink-0"
                  />
                  <span className="flex-1 text-[14px] font-medium text-foreground truncate">
                    {friend.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleUserSelection(friend.userId)}
                    className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                    aria-label={`Bỏ ${friend.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {tempSelected.length === 0 && (
                <div className="h-full flex items-center justify-center text-center p-4">
                  <p className="text-sm text-muted-foreground">Chưa có bạn bè nào được chọn</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-end gap-3 bg-card shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-[15px]"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-8 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-all text-[15px] shadow-sm dark:shadow-none"
          >
            {tempSelected.length > 0 ? `Xong (${tempSelected.length})` : 'Xong'}
          </button>
        </div>
      </div>
    </div>
  );
};
