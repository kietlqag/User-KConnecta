import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../../home/components/Header';
import { ProfileHeader, ProfileTabs, EditProfileDialog } from '../components';
import { authService } from '@/services/authService';
import { 
  MapPin, 
  Home, 
  Cake, 
  Heart, 
  Users, 
  Activity, 
  MessageSquare, 
  Globe, 
  Edit2, 
  Lock
} from 'lucide-react';

export function ProfileAboutPage() {
  const { username: urlUsername } = useParams();
  const currentUser = authService.getCurrentUser();
  const username = urlUsername || currentUser?.username || '';
  const isOwnProfile = currentUser?.username === username;
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Chưa cập nhật';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const [y, m, d] = parts;
    return `${parseInt(d)} tháng ${parseInt(m)}, ${y}`;
  };

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authService.getUserByUsername(username);
        setProfile(response);
        
        // If it's our own profile, update the local storage to keep it fresh
        if (isOwnProfile) {
          authService.saveCurrentUser(response);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Fallback for own profile if API fails
        if (isOwnProfile) {
          setProfile(currentUser);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username, isOwnProfile]);

  // Merge with defaults/mock if needed
  const userProfile = {
    id: profile?.id || username,
    fullName: profile?.fullName || 'Quốc Kiệt',
    username: profile?.username || username,
    avatar: profile?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
    coverPhoto: profile?.coverPhotoUrl || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200',
    friendsCount: 253,
    location: profile?.location || 'Thành phố Hồ Chí Minh',
    school: profile?.school || 'Trường Đại học Công nghệ Kỹ thuật TP HCM',
    hometown: profile?.hometown || 'Tịnh An, An Giang, Vietnam',
    birthday: profile?.dateOfBirth ? formatDate(profile.dateOfBirth) : '13 tháng 4, 2000',
    dateOfBirth: profile?.dateOfBirth,
    gender: profile?.gender || 'Nam',
    relationship: profile?.relationshipStatus || 'Độc thân',
    pronouns: 'anh ấy',
    languages: 'Tiếng Việt, Tiếng Anh',
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>;
  }

  const aboutTabs = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'personal', label: 'Thông tin cá nhân', active: true },
    { id: 'work', label: 'Công việc' },
    { id: 'education', label: 'Trình độ học vấn' },
    { id: 'interests', label: 'Sở thích' },
    { id: 'concerns', label: 'Mối quan tâm' },
    { id: 'travel', label: 'Du lịch' },
    { id: 'links', label: 'Liên kết' },
    { id: 'contact', label: 'Thông tin liên hệ' },
    { id: 'name', label: 'Tên' },
    { id: 'details', label: 'Chi tiết về bạn' },
  ];

  const personalInfo = [
    {
      title: 'Vị trí',
      items: [
        { icon: <MapPin className="w-6 h-6 text-gray-500" />, label: userProfile.location, subLabel: 'Tỉnh/thành phố hoặc thị trấn hiện tại' }
      ]
    },
    {
      title: 'Quê quán',
      items: [
        { icon: <Home className="w-6 h-6 text-gray-500" />, label: userProfile.hometown, subLabel: 'Quê quán' }
      ]
    },
    {
      title: 'Sinh nhật',
      items: [
        { 
          icon: <Cake className="w-6 h-6 text-gray-500" />, 
          label: '13 tháng 4', 
          subLabel: 'Ngày sinh',
          details: '2000\nNăm sinh',
          privacy: <Lock className="w-4 h-4 text-gray-500" />,
          canEdit: true
        }
      ]
    },
    {
      title: 'Trạng thái',
      items: [
        { icon: <Heart className="w-6 h-6 text-gray-500" />, label: userProfile.relationship, subLabel: 'Tình trạng mối quan hệ' }
      ]
    },
    {
      title: 'Thành viên trong gia đình',
      items: [
        { icon: <Users className="w-6 h-6 text-gray-500" />, label: 'Gia đình', subLabel: 'Gia đình' }
      ]
    },
    {
      title: 'Giới tính',
      items: [
        { 
          icon: <Activity className="w-6 h-6 text-gray-500" />, 
          label: userProfile.gender, 
          subLabel: 'Giới tính',
          privacy: <Globe className="w-4 h-4 text-gray-500" />,
          canEdit: true
        }
      ]
    },
    {
      title: 'Danh xưng',
      items: [
        { 
          icon: <MessageSquare className="w-6 h-6 text-gray-500" />, 
          label: userProfile.pronouns, 
          subLabel: 'Danh xưng trên hệ thống',
          privacy: <Globe className="w-4 h-4 text-gray-500" />,
          canEdit: true
        }
      ]
    },
    {
      title: 'Ngôn ngữ',
      items: [
        { icon: <Globe className="w-6 h-6 text-gray-500" />, label: userProfile.languages }
      ]
    }
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
          onEditClick={() => setIsEditDialogOpen(true)}
        />

        <ProfileTabs username={username} isOwnProfile={isOwnProfile} />

        <div className="max-w-[1100px] mx-auto px-4 py-4 mt-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
            {/* Left Sidebar */}
            <div className="w-full md:w-[300px] border-r border-gray-200 dark:border-gray-700 pt-4">
              <h2 className="px-4 text-xl font-bold text-gray-900 dark:text-white mb-4">Giới thiệu</h2>
              <nav className="space-y-1">
                {aboutTabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`w-full text-left px-4 py-2 text-[15px] font-medium transition-colors ${
                      tab.active 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Right Content */}
            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
              {personalInfo.map((section, idx) => (
                <div key={idx} className="space-y-4">
                  <h3 className="text-gray-500 dark:text-gray-400 font-medium text-sm">{section.title}</h3>
                  <div className="space-y-6">
                    {section.items.map((item, i) => (
                      <div key={i} className="flex items-start justify-between group">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {item.icon}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-gray-900 dark:text-white font-medium">{item.label}</p>
                            {item.details && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">{item.details}</p>
                            )}
                            {item.subLabel && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{item.subLabel}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {item.privacy && item.privacy}
                          {isOwnProfile && (
                            <button 
                              onClick={() => setIsEditDialogOpen(true)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Edit2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <EditProfileDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        initialData={{
          fullName: userProfile.fullName,
          location: userProfile.location,
          hometown: userProfile.hometown,
          school: userProfile.school,
          relationship: userProfile.relationship,
          birthday: userProfile.birthday,
          dateOfBirth: userProfile.dateOfBirth,
          avatarUrl: userProfile.avatar,
          coverPhotoUrl: userProfile.coverPhoto,
        }}
      />
    </div>
  );
}
