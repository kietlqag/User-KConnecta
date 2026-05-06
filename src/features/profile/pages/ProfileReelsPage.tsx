import * as React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '../../home/components/Header';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileTabs } from '../components/ProfileTabs';
import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';
import { friendService } from '@/services/friendService';
import { Play } from 'lucide-react';

export function ProfileReelsPage() {
  const { userId: routeUserId } = useParams();
  const currentUser = React.useMemo(() => authService.getCurrentUser(), []);
  
  // Sanitize userId: Avoid 'undefined' string and fallback to current user
  const userId = React.useMemo(() => {
    if (!routeUserId || routeUserId === 'undefined') {
      return currentUser?.id || '';
    }
    return routeUserId;
  }, [routeUserId, currentUser?.id]);

  const isOwnProfile = currentUser?.id === userId;
  const [profile, setProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'yours' | 'saved'>('yours');
  const [reels, setReels] = React.useState<any[]>([]);
  const [friendsCount, setFriendsCount] = React.useState(0);

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (!userId || userId === 'undefined') {
        setLoading(false);
        return;
      }
      try {
        const [profileResponse, paginatedPosts, friendsResponse] = await Promise.all([
          authService.getUserById(userId),
          postService.getAllPosts(currentUser?.id, userId),
          friendService.getFriends(userId)
        ]);
        
        setProfile(profileResponse);
        setFriendsCount(friendsResponse.length);

        const videoPosts = paginatedPosts.content.filter(post => 
          post.media?.some(m => m.mediaType === 'VIDEO')
        ).map(post => {
          const video = post.media.find(m => m.mediaType === 'VIDEO');
          return {
            id: post.id,
            title: post.content || 'Thước phim',
            views: post.reactionCount * 10, // Mocking views
            thumbnail: video?.mediaUrl || video?.fileUrl || '',
            duration: '0:15'
          };
        });
        setReels(videoPosts);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const userProfile = {
    id: profile?.id || userId,
    fullName: profile?.fullName || 'Người dùng',
    username: profile?.username || '',
    avatar: profile?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
    coverPhoto: profile?.coverPhotoUrl || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200',
    friendsCount: friendsCount,
    location: profile?.location || 'Thành phố Hồ Chí Minh',
    school: profile?.school || 'Trường Đại học Công nghệ Kỹ thuật TP HCM',
  };



  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
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

        <ProfileTabs userId={userId} isOwnProfile={isOwnProfile} />

        <div className="max-w-[1100px] mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reels</h2>
              <button className="text-blue-600 dark:text-blue-400 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                Tạo thước phim
              </button>
            </div>

            {/* Inner Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 px-2">
              <button
                onClick={() => setActiveTab('yours')}
                className={`px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
                  activeTab === 'yours'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Thước phim của bạn
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
                  activeTab === 'saved'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Thước phim đã lưu
              </button>
            </div>

            <div className="p-4">
              {activeTab === 'yours' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {reels.map((reel) => (
                    <div
                      key={reel.id}
                      className="relative aspect-[9/16] rounded-lg overflow-hidden group cursor-pointer bg-gray-200 dark:bg-gray-700"
                    >
                      <ImageWithFallback
                        src={reel.thumbnail}
                        alt={reel.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100">
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">
                            {reel.title}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-white fill-white"><Play size={10} strokeWidth={3} /></span>
                            <span className="text-white text-[11px] font-medium">{reel.views}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <Play size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Chưa có thước phim nào đã lưu</h3>
                  <p className="text-sm">Khi bạn lưu thước phim, chúng sẽ xuất hiện ở đây.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
