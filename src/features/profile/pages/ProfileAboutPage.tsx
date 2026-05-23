import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../../home/components/Header';
import { ProfileHeader, ProfileTabs, EditProfileDialog } from '../components';
import { authService } from '@/services/authService';
import { friendService } from '@/services/friendService';
import {
  MapPin,
  Home,
  Cake,
  Heart,
  GraduationCap,
  Activity,
  MessageSquare,
  Globe,
  Edit2,
} from 'lucide-react';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300';
const DEFAULT_COVER  = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200';

const ABOUT_TABS = [
  { id: 'overview',   label: 'Tổng quan' },
  { id: 'personal',   label: 'Thông tin cá nhân' },
  { id: 'work',       label: 'Công việc' },
  { id: 'education',  label: 'Trình độ học vấn' },
  { id: 'contact',    label: 'Thông tin liên hệ' },
];

function formatDate(dateString?: string) {
  if (!dateString) return null;
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const [y, m, d] = parts;
  return `${parseInt(d)} tháng ${parseInt(m)}, ${y}`;
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  isOwnProfile?: boolean;
  onEdit?: () => void;
}

function InfoRow({ icon, label, sub, isOwnProfile, onEdit }: InfoRowProps) {
  return (
    <div className="flex items-start justify-between group">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-gray-500 dark:text-gray-400">{icon}</div>
        <div>
          <p className="text-gray-900 dark:text-white font-medium">{label}</p>
          {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
      {isOwnProfile && onEdit && (
        <button
          onClick={onEdit}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      )}
    </div>
  );
}

export function ProfileAboutPage() {
  const { userId: routeUserId } = useParams();
  const currentUser = React.useMemo(() => authService.getCurrentUser(), []);

  const userId = React.useMemo(() => {
    if (!routeUserId || routeUserId === 'undefined') return currentUser?.id || '';
    return routeUserId;
  }, [routeUserId, currentUser?.id]);

  const [profile, setProfile]           = React.useState<any>(null);
  const [friendsCount, setFriendsCount] = React.useState(0);
  const [loading, setLoading]           = React.useState(true);
  const [activeTab, setActiveTab]       = React.useState('overview');
  const [isEditOpen, setIsEditOpen]     = React.useState(false);

  const [resolvedId, setResolvedId] = React.useState('');
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
        console.error('Error fetching about page:', err);
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
    fullName:     profile?.fullName       || 'Người dùng',
    username:     profile?.username       || '',
    avatar:       profile?.avatarUrl      || DEFAULT_AVATAR,
    coverPhoto:   profile?.coverPhotoUrl  || DEFAULT_COVER,
    location:     profile?.location       || '',
    school:       profile?.school         || '',
    hometown:     profile?.hometown       || '',
    relationship: profile?.relationshipStatus || '',
    bio:          profile?.bio            || '',
    dateOfBirth:  profile?.dateOfBirth,
    gender:       profile?.gender         || '',
  };

  /* ---------- sections per tab ---------- */
  const overviewRows: InfoRowProps[] = [
    userProfile.location     && { icon: <MapPin className="w-5 h-5" />,        label: userProfile.location,     sub: 'Đang sống tại'             },
    userProfile.hometown     && { icon: <Home className="w-5 h-5" />,          label: userProfile.hometown,     sub: 'Quê quán'                  },
    userProfile.school       && { icon: <GraduationCap className="w-5 h-5" />, label: userProfile.school,       sub: 'Học tại'                   },
    userProfile.relationship && { icon: <Heart className="w-5 h-5" />,         label: userProfile.relationship, sub: 'Tình trạng mối quan hệ'    },
    userProfile.dateOfBirth  && { icon: <Cake className="w-5 h-5" />,          label: formatDate(userProfile.dateOfBirth) || '', sub: 'Ngày sinh' },
  ].filter(Boolean) as InfoRowProps[];

  const personalRows: InfoRowProps[] = [
    userProfile.location    && { icon: <MapPin className="w-5 h-5" />,  label: userProfile.location,                       sub: 'Tỉnh/thành phố hiện tại' },
    userProfile.hometown    && { icon: <Home className="w-5 h-5" />,    label: userProfile.hometown,                       sub: 'Quê quán'                },
    userProfile.dateOfBirth && { icon: <Cake className="w-5 h-5" />,    label: formatDate(userProfile.dateOfBirth) || '',  sub: 'Ngày sinh'               },
    userProfile.relationship&& { icon: <Heart className="w-5 h-5" />,   label: userProfile.relationship,                   sub: 'Tình trạng mối quan hệ'  },
    userProfile.gender      && { icon: <Activity className="w-5 h-5" />,label: userProfile.gender,                         sub: 'Giới tính'               },
  ].filter(Boolean) as InfoRowProps[];

  const educationRows: InfoRowProps[] = [
    userProfile.school && { icon: <GraduationCap className="w-5 h-5" />, label: userProfile.school, sub: 'Trường học' },
  ].filter(Boolean) as InfoRowProps[];

  const tabRows: Record<string, InfoRowProps[]> = {
    overview:  overviewRows,
    personal:  personalRows,
    education: educationRows,
    work:      [],
    contact:   [],
  };

  const currentRows = tabRows[activeTab] ?? [];

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
          onEditClick={isOwnProfile ? () => setIsEditOpen(true) : undefined}
        />

        <ProfileTabs profileKey={profilePathKey} isOwnProfile={isOwnProfile} />

        <div className="max-w-[1100px] mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row min-h-[500px]">

            {/* Left nav */}
            <div className="w-full md:w-[260px] border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 pt-4 flex-shrink-0">
              <h2 className="px-4 text-xl font-bold text-gray-900 dark:text-white mb-3">Giới thiệu</h2>
              <nav className="space-y-0.5 pb-4">
                {ABOUT_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-4 py-2.5 text-[15px] font-medium rounded-lg mx-1 transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Right content */}
            <div className="flex-1 p-6">
              {currentRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-3">Chưa có thông tin nào.</p>
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditOpen(true)}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Thêm thông tin
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {currentRows.map((row, i) => (
                    <InfoRow
                      key={i}
                      {...row}
                      isOwnProfile={isOwnProfile}
                      onEdit={() => setIsEditOpen(true)}
                    />
                  ))}
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditOpen(true)}
                      className="mt-2 w-full py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Chỉnh sửa thông tin
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isOwnProfile && (
        <EditProfileDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          initialData={{
            fullName:     userProfile.fullName,
            location:     userProfile.location,
            hometown:     userProfile.hometown,
            school:       userProfile.school,
            relationship: userProfile.relationship,
            bio:          userProfile.bio,
            dateOfBirth:  userProfile.dateOfBirth,
            avatarUrl:    userProfile.avatar,
            coverPhotoUrl:userProfile.coverPhoto,
          }}
        />
      )}
    </div>
  );
}
