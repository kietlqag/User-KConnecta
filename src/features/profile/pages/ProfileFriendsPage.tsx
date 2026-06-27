import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { authService } from '@/services/authService';
import { friendService } from '@/services/friendService';
import { useProfileLayoutContext } from './ProfileLayout';
import { logProfileTabError, useProfileTabDebug } from '../utils/profileTabLogger';

interface FriendItem {
  friendshipId: string | null;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  mutualFriends: number;
}


function FriendSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted animate-pulse">
      <div className="w-16 h-16 rounded-lg bg-muted flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-3 w-20 rounded bg-muted" />
      </div>
    </div>
  );
}

export function ProfileFriendsPage() {
  const { resolvedId, loading: profileLoading } = useProfileLayoutContext();
  useProfileTabDebug('friends', resolvedId);
  const navigate = useNavigate();
  const currentUser = React.useMemo(() => authService.getCurrentUser(), []);

  const [friends, setFriends] = React.useState<FriendItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (!resolvedId) {
      setFriends([]);
      setLoading(true);
      return;
    }

    let cancelled = false;
    setFriends([]);
    setLoading(true);

    friendService.getFriends(resolvedId).then(res => {
      if (cancelled) return;
      setFriends(res);
    }).catch((err) => {
      logProfileTabError('friends', 'load-friends', err, { resolvedId });
    }).finally(() => { if (!cancelled) setLoading(false); });

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
      <div className="bg-card rounded-2xl shadow-sm dark:shadow-none border border-border p-5">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-foreground">
              Bạn bè
              {!isLoadingContent && (
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  · {friends.length}
                </span>
              )}
            </h2>
          </div>
          {!isLoadingContent && friends.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm bạn bè"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all"
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
              <div className="absolute inset-0 rotate-6 rounded-xl bg-muted" />
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-muted border border-border">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Chưa có bạn bè nào</h3>
            <p className="text-sm text-muted-foreground">Danh sách bạn bè sẽ xuất hiện ở đây.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Không tìm thấy bạn bè nào phù hợp với "{search}".
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map(friend => (
              <div
                key={friend.userId}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:shadow-md transition-all cursor-pointer group"
                onClick={() => navigate(`/profile/${friend.username || friend.userId}`)}
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                  <UserAvatar
                    name={friend.fullName}
                    avatarUrl={friend.avatarUrl}
                    userId={friend.userId}
                    rounded="lg"
                    className="w-full h-full transition-transform duration-200 group-hover:scale-105"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {friend.fullName}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
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
