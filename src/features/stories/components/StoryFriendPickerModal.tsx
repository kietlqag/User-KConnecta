import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Search } from 'lucide-react';
import { friendService, type FriendApiResponse } from '@/services/friendService';
import { authService } from '@/services/authService';

interface StoryFriendPickerModalProps {
  isOpen: boolean;
  selectedFriendIds: string[];
  onClose: () => void;
  onDone: (selectedFriendIds: string[]) => void;
}

export function StoryFriendPickerModal({
  isOpen,
  selectedFriendIds,
  onClose,
  onDone,
}: StoryFriendPickerModalProps) {
  const [friends, setFriends] = useState<FriendApiResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelected, setTempSelected] = useState<string[]>(selectedFriendIds);

  useEffect(() => {
    if (!isOpen) return;
    setTempSelected(selectedFriendIds);
    setSearchQuery('');
  }, [isOpen, selectedFriendIds]);

  useEffect(() => {
    if (!isOpen) return;
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;

    let cancelled = false;
    setLoading(true);
    friendService
      .getFriends(currentUser.id)
      .then((data) => {
        if (!cancelled) setFriends(data);
      })
      .catch(() => {
        if (!cancelled) setFriends([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const filteredFriends = useMemo(
    () =>
      friends.filter((friend) =>
        friend.fullName.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      ),
    [friends, searchQuery],
  );

  if (!isOpen) return null;

  const toggleFriend = (userId: string) => {
    setTempSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-[500px] flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="relative flex shrink-0 items-center border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </button>
          <h2 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-gray-900 dark:text-white">
            Chọn bạn bè
          </h2>
        </div>

        <div className="shrink-0 border-b border-gray-200 p-4 dark:border-gray-700">
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Chọn một hoặc nhiều bạn bè có thể xem tin này. Bỏ trống để tất cả bạn bè đều xem được.
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm bạn bè"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-full bg-gray-100 py-2 pl-9 pr-4 text-sm outline-none dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Đang tải danh sách bạn bè...</p>
          ) : filteredFriends.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              {friends.length === 0 ? 'Bạn chưa có bạn bè nào' : 'Không tìm thấy bạn bè'}
            </p>
          ) : (
            <div className="space-y-1">
              {filteredFriends.map((friend) => {
                const isSelected = tempSelected.includes(friend.userId);
                return (
                  <button
                    key={friend.userId}
                    type="button"
                    onClick={() => toggleFriend(friend.userId)}
                    className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
                  >
                    <img
                      src={friend.avatarUrl ?? '/default-avatar.png'}
                      alt={friend.fullName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <span className="flex-1 text-left font-medium text-gray-900 dark:text-white">
                      {friend.fullName}
                    </span>
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-400 dark:border-gray-500'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-6 py-2 font-semibold text-blue-600 transition-colors hover:bg-gray-100 dark:text-blue-400 dark:hover:bg-gray-700"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => onDone(tempSelected)}
            className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {tempSelected.length > 0 ? `Xong (${tempSelected.length})` : 'Tất cả bạn bè'}
          </button>
        </div>
      </div>
    </div>
  );
}
