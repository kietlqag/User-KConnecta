import * as React from 'react';
import { useParams } from 'react-router-dom';
import { ThumbsUp } from 'lucide-react';
import { Header } from '../../home/components/Header';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileTabs } from '../components/ProfileTabs';
import { authService } from '@/services/authService';
import { friendService } from '@/services/friendService';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300';
const DEFAULT_COVER  = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200';

const LIKE_CATEGORIES = [
  { id: 'all',       label: 'Tất cả' },
  { id: 'movies',    label: 'Phim' },
  { id: 'tv',        label: 'Chương trình TV' },
  { id: 'music',     label: 'Âm nhạc' },
  { id: 'books',     label: 'Sách' },
  { id: 'sports',    label: 'Thể thao' },
  { id: 'games',     label: 'Trò chơi' },
];

export function ProfileLikesPage() {
  const { userId: routeUserId } = useParams();
  const currentUser = React.useMemo(() => authService.getCurrentUser(), []);

  const userId = React.useMemo(() => {
    if (!routeUserId || routeUserId === 'undefined') return currentUser?.id || '';
    return routeUserId;
  }, [routeUserId, currentUser?.id]);

  const [profile, setProfile]           = React.useState<any>(null);
  const [friendsCount, setFriendsCount] = React.useState(0);
  const [loading, setLoading]           = React.useState(true);
  const [activeTab, setActiveTab]       = React.useState('all');
  const [resolvedId, setResolvedId]     = React.useState('');

  const isOwnProfile = !!currentUser && (
    resolvedId ? currentUser.id === resolvedId : (userId === currentUser.id || userId === currentUser.username)
  );

  /* ---------- fetch ---------- */
  React.useEffect(() => {
    if (!userId || userId === 'undefined') { setLoading(false); return; }
    let cancelled = false;

    const run = async () => {
      try {
        let profileData: any;
        try { profileData = await authService.getUserById(userId); }
        catch { profileData = await authService.getUserByUsername(userId); }

        const id: string = profileData.id;
        const friendsRes = await friendService.getFriends(id);

        if (cancelled) return;
        setProfile(profileData);
        setResolvedId(id);
        setFriendsCount(friendsRes.length);
      } catch (err) {
        console.error('Error fetching likes page:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [userId]);

  /* ---------- derived ---------- */
  const profilePathKey = profile?.username || userId;

  const userProfile = {
    fullName:   profile?.fullName      || 'Người dùng',
    username:   profile?.username      || '',
    avatar:     profile?.avatarUrl     || DEFAULT_AVATAR,
    coverPhoto: profile?.coverPhotoUrl || DEFAULT_COVER,
    location:   profile?.location      || '',
    school:     profile?.school        || '',
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />

      <div className="pt-14">
        <ProfileHeader
          coverPhoto={loading ? undefined : userProfile.coverPhoto}
          avatar={loading ? undefined : userProfile.avatar}
          fullName={userProfile.fullName}
          username={userProfile.username}
          friendsCount={friendsCount}
          location={userProfile.location}
          school={userProfile.school}
          isOwnProfile={isOwnProfile}
          loading={loading}
        />

        <ProfileTabs profileKey={profilePathKey} isOwnProfile={isOwnProfile} />

        <div className="max-w-[1100px] mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <ThumbsUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Thích</h2>
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1 px-3 overflow-x-auto scrollbar-none border-b border-gray-200 dark:border-gray-700">
              {LIKE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                    activeTab === cat.id
                      ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                      : 'text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Empty state */}
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="relative mb-4 h-20 w-20">
                <div className="absolute inset-0 rotate-6 rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <ThumbsUp className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">Chưa có lượt thích nào</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Các trang và nội dung bạn thích sẽ xuất hiện ở đây.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
