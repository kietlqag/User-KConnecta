import { vi } from '@/constants/vi';
import { formatVi } from '@/constants/formatVi';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FriendRequest } from '../../types/friends.types';
import { UserAvatar } from '@/components/shared';

interface SentFriendRequestCardProps {
  request: FriendRequest;
  onCancel: (id: string) => Promise<void>;
}

export function SentFriendRequestCard({ request, onCancel }: SentFriendRequestCardProps) {  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    try {
      await onCancel(request.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm [contain:paint] dark:shadow-none">
      <Link to={`/profile/${request.userId}`} className="block aspect-square overflow-hidden bg-background">
        <UserAvatar
          name={request.name}
          avatarUrl={request.avatar}
          userId={request.userId}
        />
      </Link>

      <div className="flex min-h-[140px] flex-1 flex-col p-3">
        <Link to={`/profile/${request.userId}`}>
          <h3 className="truncate text-[15px] font-bold leading-6 text-foreground">
            {request.name}
          </h3>
        </Link>

        <p className="mt-1 h-5 truncate text-sm text-muted-foreground">
          {formatVi(vi.friendRequestCard.mutualFriends, { count: request.mutualFriends })}
        </p>
        <p className="mt-1 h-4 truncate text-xs text-muted-foreground">{request.timestamp}</p>

        <div className="mt-auto pt-4">
          <button
            type="button"
            onClick={() => void handleCancel()}
            disabled={loading}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-muted px-4 font-semibold text-foreground transition-colors hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {vi.friendCard.cancelRequest}
          </button>
        </div>
      </div>
    </div>
  );
}
