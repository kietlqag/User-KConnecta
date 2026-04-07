import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../../home/components/Header';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileTabs } from '../components/ProfileTabs';
import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { authService } from '@/services/authService';

export function ProfilePhotosPage() {
  const { userId: routeUserId } = useParams();
  const currentUser = authService.getCurrentUser();
  const userId = routeUserId || currentUser?.id || '';
  const isOwnProfile = currentUser?.id === userId;
  const [profile, setProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authService.getUserById(userId);
        setProfile(response);
        if (isOwnProfile) {
          authService.saveCurrentUser(response);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
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
    friendsCount: 253,
    location: profile?.location || 'Thành phố Hồ Chí Minh',
    school: profile?.school || 'Trường Đại học Công nghệ Kỹ thuật TP HCM',
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
  }

  const photos = [
    { id: '1', url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600', timestamp: '21 tháng 1' },
    { id: '2', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=600', timestamp: '18 tháng 1' },
    { id: '3', url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600', timestamp: '15 tháng 1' },
    { id: '4', url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600', timestamp: '10 tháng 1' },
    { id: '5', url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600', timestamp: '5 tháng 1' },
    { id: '6', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600', timestamp: '2 tháng 1' },
    { id: '7', url: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=600', timestamp: '28 tháng 12' },
    { id: '8', url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600', timestamp: '25 tháng 12' },
    { id: '9', url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600', timestamp: '20 tháng 12' },
    { id: '10', url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600', timestamp: '15 tháng 12' },
    { id: '11', url: 'https://images.unsplash.com/photo-1552581234-26160f608093?w=600', timestamp: '10 tháng 12' },
    { id: '12', url: 'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=600', timestamp: '5 tháng 12' },
  ];

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
