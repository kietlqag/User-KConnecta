import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search } from 'lucide-react';
import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { authService } from '@/services/authService';
import { friendService } from '@/services/friendService';
import { useProfileLayoutContext } from './ProfileLayout';

interface FriendItem {
  friendshipId: string | null;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  mutualFriends: number;
}

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=User&background=random';

function FriendSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse">
      <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-600 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-600" />
        <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-600" />
      </div>
    </div>
  );
}

export function ProfileFriendsPage() {
  const { resolvedId, loading: profileLoading } = useProfileLayoutContext();
  const navigate = useNavigate();
  const currentUser = React.useMemo(() => authService.getCurrentUser(), []);

  const [friends, setFriends] = React.useState<FriendItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (!resolvedId) return;
    let cancelled = false;
    setLoading(true);

    friendService.getFriends(resolvedId).then(res => {
      if (cancelled) return;
      setFriends(res);
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [resolvedId]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(f =>
      f.fullName.toLowerCase().includes(q) || f.username.toLowerCase().includes(q),
    );
  }, [friends, search]);

  const isLoadingContent = profileLoading || loading;

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-700 p-5">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Bạn bè
              {!isLoadingContent && (
                <span className="ml-2 text-base font-normal text-gray-500 dark:text-gray-400">
                  · {friends.length}
                </span>
              )}
            </h2>
          </div>
          {!isLoadingContent && friends.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm bạn bè"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all"
              />
            </div>
          )}
        </div>

        {isLoadingContent ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => <FriendSkeleton key={i} />)}
          </div>
        ) : friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-4 h-20 w-20">
              <div className="absolute inset-0 rotate-6 rounded-xl bg-gray-200 dark:bg-gray-700" />
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <Users className="h-10 w-10 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">Chưa có bạn bè nào</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Danh sách bạn bè sẽ xuất hiện ở đây.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            Không tìm thấy bạn bè nào phù hợp với "{search}".
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map(friend => (
              <div
                key={friend.userId}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => navigate(`/profile/${friend.username || friend.userId}`)}
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-700">
                  <ImageWithFallback
                    src={friend.avatarUrl || DEFAULT_AVATAR}
                    alt={friend.fullName}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {friend.fullName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {friend.mutualFriends > 0 ? `${friend.mutualFriends} bạn chung` : 'Chưa có bạn chung'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
