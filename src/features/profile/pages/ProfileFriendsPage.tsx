import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Header } from '../../home/components/Header';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileTabs } from '../components/ProfileTabs';
import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { authService } from '@/services/authService';
import { friendService } from '@/services/friendService';
import { FriendCard } from '../../friends/components/FriendCard/FriendCard';

export function ProfileFriendsPage() {
  const { userId: routeUserId } = useParams();
  const currentUser = authService.getCurrentUser();
  const userId = routeUserId || currentUser?.id || '';
  const isOwnProfile = currentUser?.id === userId;
  const [profile, setProfile] = React.useState<any>(null);
  const [friends, setFriends] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [friendsLoading, setFriendsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileRes, friendsRes] = await Promise.all([
          authService.getUserById(userId),
          friendService.getFriends(userId)
        ]);
        
        setProfile(profileRes);
        
        // Map API response to FriendCard format
        const mappedFriends = friendsRes.map(f => ({
          id: f.userId,
          name: f.fullName,
          avatar: f.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
          mutualFriends: f.mutualFriends,
          isFriend: true, // They are friends with the profile owner
        }));
        
        setFriends(mappedFriends);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
        setFriendsLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const userProfile = {
    id: profile?.id || userId,
    fullName: profile?.fullName || 'Quốc Kiệt',
    username: profile?.username || currentUser?.username || '',
    avatar: profile?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
    coverPhoto: profile?.coverPhotoUrl || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200',
    friendsCount: profile?.friendsCount || friends.length,
    location: profile?.location || 'Thành phố Hồ Chí Minh',
    school: profile?.school || 'Trường Đại học Công nghệ Kỹ thuật TP HCM',
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans">
      <Header />

      <div className="pt-14">
        <ProfileHeader
          coverPhoto={userProfile.coverPhoto}
          avatar={userProfile.avatar}
          fullName={userProfile.fullName}
          username={userProfile.username}
          friendsCount={userProfile.friendsCount}
          location={userProfile.location}
          school={userProfile.school}
          isOwnProfile={isOwnProfile}
        />

        <ProfileTabs userId={userProfile.id} isOwnProfile={isOwnProfile} />

        <div className="max-w-[1100px] mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Bạn bè
                <span className="ml-2 text-lg font-normal text-gray-500">
                  {friends.length} người bạn
                </span>
              </h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm bạn bè"
                  className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all"
                />
              </div>
            </div>

            {friendsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : friends.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {friends.map((friend) => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    onMessage={(id) => console.log('Message', id)}
                    onUnfriend={isOwnProfile ? (id) => console.log('Unfriend', id) : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400">Không tìm thấy bạn bè nào.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
