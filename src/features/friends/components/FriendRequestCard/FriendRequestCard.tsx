import { vi } from '@/constants/vi';
import { formatVi } from '@/constants/formatVi';
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
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm [contain:paint] dark:shadow-none">
      <div className="relative shrink-0">
        <Link to={`/profile/${request.userId}`} className="block aspect-square overflow-hidden bg-background">
          <UserAvatar
            name={request.name}
            avatarUrl={request.avatar}
            userId={request.userId}
          />
        </Link>
        <button
          onClick={handleDelete}
          disabled={loading !== null}
          className="absolute right-2 top-2 rounded-full bg-card/95 p-2 shadow-md transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={vi.friendRequestCard.deleteAria}
        >
          {loading === 'delete' ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <X className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      <div className="flex min-h-[172px] flex-1 flex-col p-3">
        <Link to={`/profile/${request.userId}`}>
          <h3 className="truncate text-[15px] font-bold leading-6 text-foreground">
            {request.name}
          </h3>
        </Link>

        <p className="mt-1 h-5 truncate text-sm text-muted-foreground">
          {formatVi(vi.friendRequestCard.mutualFriends, { count: request.mutualFriends })}
        </p>
        <p className="mt-1 h-4 truncate text-xs text-muted-foreground">{request.timestamp}</p>

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <button
            onClick={handleAccept}
            disabled={loading !== null}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === 'accept' && <Loader2 className="h-4 w-4 animate-spin" />}
            {vi.friendRequestCard.confirm}
          </button>
          <button
            onClick={handleDelete}
            disabled={loading !== null}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-red-50 px-4 font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === 'delete' && <Loader2 className="h-4 w-4 animate-spin" />}
            {vi.friendRequestCard.delete}
          </button>
        </div>
      </div>
    </div>
  );
};
