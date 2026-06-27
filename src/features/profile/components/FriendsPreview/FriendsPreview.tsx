import { Link } from 'react-router-dom';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface Friend {
  id: string;
  username?: string;
  name: string;
  avatarUrl?: string | null;
}

interface FriendsPreviewProps {
  userId: string;
  friendsCount: number;
  friends: Friend[];
}

export function FriendsPreview({ userId, friendsCount, friends }: FriendsPreviewProps) {
  return (
    <div className="rounded-lg bg-card p-4 shadow">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Bạn bè</h2>
          <p className="text-muted-foreground">{friendsCount} người bạn</p>
        </div>
        <Link
          to={`/profile/${userId}/friends`}
          className="font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          Xem tất cả bạn bè
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {friends.slice(0, 9).map((friend) => (
          <Link
            key={friend.id}
            to={`/profile/${friend.username || friend.id}`}
            className="group block overflow-hidden rounded-lg"
          >
            <div className="relative mb-1 aspect-square overflow-hidden rounded-lg bg-muted">
              <UserAvatar
                name={friend.name}
                avatarUrl={friend.avatarUrl}
                userId={friend.id}
                rounded="lg"
                className="h-full w-full transition-[filter] duration-200 group-hover:brightness-95"
              />
            </div>
            <p className="line-clamp-2 text-sm font-medium text-foreground">
              {friend.name}
            </p>
          </Link>
        ))}
      </div>

      {friendsCount > 9 && (
        <Link
          to={`/profile/${userId}/friends`}
          className="mt-3 block w-full rounded-lg bg-muted py-2 text-center font-medium text-foreground transition-colors hover:bg-muted dark:text-white"
        >
          Xem tất cả
        </Link>
      )}
    </div>
  );
}
