import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FriendRequest } from '../../types/friends.types';
import { UserAvatar } from '@/components/shared';

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const FriendRequestCard = ({ request, onAccept, onDelete }: FriendRequestCardProps) => {
  const [loading, setLoading] = useState<'accept' | 'delete' | null>(null);

  const handleAccept = async () => {
    setLoading('accept');
    try {
      await onAccept(request.id);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    setLoading('delete');
    try {
      await onDelete(request.id);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm dark:shadow-none transition-shadow hover:shadow-md">
      <div className="relative">
        <Link to={`/profile/${request.userId}`} className="block aspect-square overflow-hidden bg-gray-100 dark:bg-background">
          <UserAvatar
            name={request.name}
            avatarUrl={request.avatar}
            userId={request.userId}
          />
        </Link>
        <button
          onClick={handleDelete}
          disabled={loading !== null}
          className="absolute right-2 top-2 rounded-full bg-white dark:bg-gray-800/95 p-2 shadow-md transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Xóa lời mời"
        >
          {loading === 'delete' ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-600 dark:text-gray-400" />
          ) : (
            <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      <div className="flex min-h-[172px] flex-1 flex-col p-3">
        <Link to={`/profile/${request.userId}`}>
          <h3 className="truncate text-[15px] font-bold leading-6 text-gray-900 dark:text-gray-100 hover:underline">
            {request.name}
          </h3>
        </Link>

        <p className="mt-1 h-5 truncate text-sm text-gray-600 dark:text-gray-400">
          {request.mutualFriends} bạn chung
        </p>
        <p className="mt-1 h-4 truncate text-xs text-gray-500 dark:text-gray-400">{request.timestamp}</p>

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <button
            onClick={handleAccept}
            disabled={loading !== null}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === 'accept' && <Loader2 className="h-4 w-4 animate-spin" />}
            Xác nhận
          </button>
          <button
            onClick={handleDelete}
            disabled={loading !== null}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-red-50 px-4 font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === 'delete' && <Loader2 className="h-4 w-4 animate-spin" />}
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
};
