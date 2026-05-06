import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../../home/components/Header';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileTabs } from '../components/ProfileTabs';
import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';
import { friendService } from '@/services/friendService';

export function ProfilePhotosPage() {
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
  const [photos, setPhotos] = React.useState<any[]>([]);
  const [friendsCount, setFriendsCount] = React.useState(0);

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileResponse, paginatedPosts, friendsResponse] = await Promise.all([
          authService.getUserById(userId),
          postService.getAllPosts(currentUser?.id, userId),
          friendService.getFriends(userId)
        ]);

        setProfile(profileResponse);
        setFriendsCount(friendsResponse.length);

        if (isOwnProfile) {
          authService.saveCurrentUser(profileResponse);
        }

        // Extract all images from posts
        const allPhotos = paginatedPosts.content.flatMap(post => 
          post.media
            .filter(m => m.mediaType === 'IMAGE')
            .map(m => ({
              id: m.id,
              url: m.mediaUrl || m.fileUrl,
              timestamp: new Date(post.createdAt).toLocaleDateString('vi-VN', { 
                day: 'numeric', 
                month: 'long' 
              })
            }))
        );
        setPhotos(allPhotos);
      } catch (error) {
        console.error('Error fetching profile data:', error);
        if (isOwnProfile) {
          setProfile(currentUser);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, isOwnProfile]);

  const userProfile = {
    id: profile?.id || userId,
    fullName: profile?.fullName || 'Quốc Kiệt',
    username: profile?.username || currentUser?.username || '',
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

        <ProfileTabs userId={userProfile.id} isOwnProfile={isOwnProfile} />

        <div className="max-w-[1100px] mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Ảnh · {photos.length}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer"
                >
                  <ImageWithFallback
                    src={photo.url}
                    alt={`Ảnh ${photo.id}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-end">
                    <p className="text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {photo.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
