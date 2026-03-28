import { Link } from 'react-router@7.1.3';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';

interface Friend {
  id: string;
  name: string;
  avatar: string;
}

interface FriendsPreviewProps {
  username: string;
  friendsCount: number;
  friends: Friend[];
}

export function FriendsPreview({ username, friendsCount, friends }: FriendsPreviewProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Bạn bè</h2>
          <p className="text-gray-600">{friendsCount} người bạn</p>
        </div>
        <Link
          to={`/profile/${username}/friends`}
          className="text-emerald-600 hover:underline font-medium"
        >
          Xem tất cả bạn bè
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {friends.slice(0, 9).map((friend) => (
          <Link
            key={friend.id}
            to={`/profile/${friend.id}`}
            className="group"
          >
            <div className="aspect-square rounded-lg overflow-hidden mb-1">
              <ImageWithFallback
                src={friend.avatar}
                alt={friend.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <p className="text-sm font-medium text-gray-900 line-clamp-2">
              {friend.name}
            </p>
          </Link>
        ))}
      </div>

      {friendsCount > 9 && (
        <Link
          to={`/profile/${username}/friends`}
          className="block w-full mt-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-center text-gray-700 font-medium transition-colors"
        >
          Xem tất cả
        </Link>
      )}
    </div>
  );
}