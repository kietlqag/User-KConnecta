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
    <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bạn bè</h2>
          <p className="text-gray-600 dark:text-gray-400">{friendsCount} người bạn</p>
        </div>
        <Link
          to={`/profile/${userId}/friends`}
          className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          Xem tất cả bạn bè
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {friends.slice(0, 9).map((friend) => (
          <Link
            key={friend.id}
            to={`/profile/${friend.username || friend.id}`}
            className="group"
          >
            <div className="mb-1 aspect-square overflow-hidden rounded-lg">
              <UserAvatar
                name={friend.name}
                avatarUrl={friend.avatarUrl}
                userId={friend.id}
                rounded="lg"
                className="h-full w-full transition-transform group-hover:scale-105"
              />
            </div>
            <p className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-white">
              {friend.name}
            </p>
          </Link>
        ))}
      </div>

      {friendsCount > 9 && (
        <Link
          to={`/profile/${userId}/friends`}
          className="mt-3 block w-full rounded-lg bg-gray-100 py-2 text-center font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
        >
          Xem tất cả
        </Link>
      )}
    </div>
  );
}
