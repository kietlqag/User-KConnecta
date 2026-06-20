import { useState } from 'react';
import { Loader2, MessageCircle, UserMinus, UserPlus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Friend } from '../../types/friends.types';
import { UserAvatar } from '@/components/shared';

interface FriendCardProps {
  friend: Friend;
  onMessage?: (id: string) => void;
  onUnfriend?: (id: string) => Promise<void>;
  onAddFriend?: (userId: string) => Promise<void>;
  onCancelFriendRequest?: (userId: string) => Promise<void>;
  pendingFriendshipId?: string;
  onRemoveSuggestion?: (id: string) => void;
  showRemove?: boolean;
}

export const FriendCard = ({
  friend,
  onMessage,
  onUnfriend,
  onAddFriend,
  onCancelFriendRequest,
  pendingFriendshipId,
  onRemoveSuggestion,
  showRemove = false,
}: FriendCardProps) => {
  const [loading, setLoading] = useState<'add' | 'cancel' | 'unfriend' | 'remove' | null>(null);

  const handleAdd = async () => {
    if (!onAddFriend) return;
    setLoading('add');
    try {
      await onAddFriend(friend.userId);
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!onCancelFriendRequest) return;
    setLoading('cancel');
    try {
      await onCancelFriendRequest(friend.userId);
    } finally {
      setLoading(null);
    }
  };

  const handleUnfriend = async () => {
    if (!onUnfriend) return;
    setLoading('unfriend');
    try {
      await onUnfriend(friend.id);
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveSuggestion = () => {
    if (!onRemoveSuggestion) return;
    setLoading('remove');
    onRemoveSuggestion(friend.id);
    setLoading(null);
  };

  const isSuggestion = showRemove && onRemoveSuggestion && !friend.isFriend && !pendingFriendshipId;

  return (
    <div className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:shadow-none transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <Link
        to={`/profile/${friend.userId}`}
        className="relative block aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-700"
      >
        <UserAvatar
          name={friend.name}
          avatarUrl={friend.avatar}
          userId={friend.userId}
          className="transition-transform group-hover:scale-105"
        />
      </Link>

      <div className="flex min-h-[156px] flex-1 flex-col p-3">
        <div className="min-w-0">
          <Link to={`/profile/${friend.userId}`} className="block">
            <h3 className="min-h-[1.5rem] truncate text-[15px] font-bold leading-6 text-gray-900 hover:underline dark:text-white">
              {friend.name}
            </h3>
          </Link>
          <p className="mt-1 h-5 truncate text-sm text-gray-500 dark:text-gray-400">
            {friend.mutualFriends > 0
              ? `${friend.mutualFriends} bạn chung`
              : 'Chưa có bạn chung'}
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-4">
          {friend.isFriend ? (
            <>
              {onMessage && (
                <button
                  onClick={() => onMessage(friend.id)}
                  className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-emerald-100 px-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Nhắn tin</span>
                </button>
              )}
              {onUnfriend && (
                <button
                  onClick={handleUnfriend}
                  disabled={loading !== null}
                  className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-gray-100 px-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {loading === 'unfriend' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserMinus className="h-4 w-4" />
                  )}
                  Hủy kết bạn
                </button>
              )}
            </>
          ) : pendingFriendshipId ? (
            <button
              onClick={handleCancel}
              disabled={loading !== null}
              className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-gray-200 dark:bg-gray-700 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === 'cancel' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Hủy lời mời
            </button>
          ) : (
            <div className="flex gap-2">
              {onAddFriend && (
                <button
                  onClick={handleAdd}
                  disabled={loading !== null}
                  className="flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-2 text-sm font-semibold text-white shadow-sm dark:shadow-none transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading === 'add' ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">Thêm bạn bè</span>
                </button>
              )}
              {isSuggestion && (
                <button
                  onClick={handleRemoveSuggestion}
                  disabled={loading !== null}
                  className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-red-50 px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading === 'remove' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Xóa
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
