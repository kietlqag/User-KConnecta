import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../../home/components/Header';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileTabs } from '../components/ProfileTabs';
import { authService } from '@/services/authService';
import { MoreHorizontal } from 'lucide-react';

export function ProfileLikesPage() {
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
  const [activeSubTab, setActiveSubTab] = React.useState('all');

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (!userId || userId === 'undefined') {
        setLoading(false);
        return;
      }
      try {
        const response = await authService.getUserById(userId);
        setProfile(response);
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
    friendsCount: 253,
    location: profile?.location || 'Thành phố Hồ Chí Minh',
    school: profile?.school || 'Trường Đại học Công nghệ Kỹ thuật TP HCM',
  };

  const likeCategories = [
    { id: 'all', label: 'Tất cả các lượt thích' },
    { id: 'movies', label: 'Phim' },
    { id: 'tv', label: 'Chương trình TV' },
    { id: 'artists', label: 'Nghệ sĩ' },
    { id: 'books', label: 'Sách' },
    { id: 'sports', label: 'Đội thể thao' },
    { id: 'athletes', label: 'Vận động viên' },
    { id: 'people', label: 'Mọi người' },
    { id: 'restaurants', label: 'Nhà hàng' },
    { id: 'apps', label: 'Ứng dụng và trò chơi' },
  ];

  const likedPages = [
    { id: '1', name: 'Brut.', image: 'https://images.unsplash.com/photo-1599305090598-fe179d501c27?w=300' },
    { id: '2', name: 'LogistiHub', image: 'https://images.unsplash.com/photo-1621932953986-15fcfec8327c?w=300' },
    { id: '3', name: 'CLB Karatedo Sư Phạm Kỹ Thuật TP.HCM', image: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=300' },
    { id: '4', name: 'ULSC - UTE Logistics & Supply Chain Club', image: 'https://images.unsplash.com/photo-1586528116311-ad86d7c71833?w=300' },
    { id: '5', name: 'Chuyên trang Nhà trọ & Việc làm - Sacute - ĐH SPKT TP.HCM', image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300' },
    { id: '6', name: 'Kiến Trúc Nội Thất - ĐH Sư phạm Kỹ thuật TP.HCM', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300' },
    { id: '7', name: 'Dăm ba cái Điểm Rèn Luyện', image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=300' },
    { id: '8', name: 'UTE Mentoring', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300' },
    { id: '9', name: "FHQ's English Club - CLB Anh Văn khoa Đào tạo CLC", image: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=300' },
    { id: '10', name: 'Becute', image: 'https://images.unsplash.com/photo-1557053910-d9eaba70b584?w=300' },
    { id: '11', name: 'Tuổi trẻ Trường ĐH Công nghệ Kỹ thuật TP.HCM', image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=300' },
    { id: '12', name: 'IELTS PMP English', image: 'https://images.unsplash.com/photo-1546410531-bb4caa1b4231?w=300' },
  ];

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
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Thích</h2>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <MoreHorizontal className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Sub Tabs */}
            <div className="flex items-center gap-2 px-2 overflow-x-auto scrollbar-none border-b border-gray-200 dark:border-gray-700">
              {likeCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveSubTab(cat.id)}
                  className={`px-4 py-3.5 text-[15px] font-semibold whitespace-nowrap transition-colors border-b-2 ${
                    activeSubTab === cat.id
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="p-4 bg-white dark:bg-gray-800">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {likedPages.map((page) => (
                  <div key={page.id} className="group cursor-pointer">
                    <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-2">
                      <img
                        src={page.image}
                        alt={page.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <p className="text-[14px] font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight">
                      {page.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
