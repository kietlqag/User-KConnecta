import { Link, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Header } from '../../home/components/Header';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileTabs } from '../components/ProfileTabs';
import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { authService } from '@/services/authService';

export function ProfileFriendsPage() {
  const { username = 'quockiet' } = useParams();
  const currentUser = authService.getCurrentUser();

  const userProfile = {
    id: currentUser?.username || 'quockiet',
    fullName: currentUser?.fullName || 'Quốc Kiệt',
    username: currentUser?.username || 'Kian',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
    coverPhoto: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200',
    friendsCount: 253,
    location: 'Thành phố Hồ Chí Minh',
    school: 'Trường Đại học Công nghệ Kỹ thuật TP HCM',
  };

  const friends = [
    { id: '1', name: 'Lê Lộc', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300', mutualFriends: 5 },
    { id: '2', name: 'Ngọc Tuyền', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300', mutualFriends: 12 },
    { id: '3', name: 'Đặng Thị Thúy An', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300', mutualFriends: 3 },
    { id: '4', name: 'Dương Trần Thái Duy', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300', mutualFriends: 8 },
    { id: '5', name: 'Ngô Gia Hân', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300', mutualFriends: 2 },
    { id: '6', name: 'Nguyễn Chí Tài', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300', mutualFriends: 7 },
    { id: '7', name: 'Cẩm Liên', avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=300', mutualFriends: 4 },
    { id: '8', name: 'Phạm Gia Huy', avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=300', mutualFriends: 9 },
    { id: '9', name: 'Hoàng Phi', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300', mutualFriends: 1 },
    { id: '10', name: 'Minh Tuấn', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300', mutualFriends: 6 },
    { id: '11', name: 'Thu Hà', avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300', mutualFriends: 11 },
    { id: '12', name: 'Bảo Long', avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=300', mutualFriends: 0 },
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
          isOwnProfile={true}
        />

        <ProfileTabs username={userProfile.id} isOwnProfile={true} />

        <div className="max-w-[1100px] mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Bạn bè · {userProfile.friendsCount}
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm bạn bè"
                  className="pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {friends.map((friend) => (
                <Link
                  key={friend.id}
                  to={`/profile/${friend.id}`}
                  className="group flex flex-col rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square overflow-hidden">
                    <ImageWithFallback
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-2">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">
                      {friend.name}
                    </p>
                    {friend.mutualFriends > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {friend.mutualFriends} bạn chung
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
