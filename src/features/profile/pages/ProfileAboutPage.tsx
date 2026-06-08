import * as React from 'react';
import {
  MapPin, Home, Cake, Heart, GraduationCap, Activity,
  MessageSquare, Mail, Briefcase, Edit2,
} from 'lucide-react';
import { authService } from '@/services/authService';
import { buildProfileDisplay, hasProfileText } from '../utils/profileDisplayUtils';
import { useProfileLayoutContext } from './ProfileLayout';

const ABOUT_TABS = [
  { id: 'overview',  label: 'Tổng quan' },
  { id: 'personal',  label: 'Thông tin cá nhân' },
  { id: 'work',      label: 'Công việc' },
  { id: 'education', label: 'Trình độ học vấn' },
  { id: 'contact',   label: 'Thông tin liên hệ' },
] as const;

type AboutTabId = (typeof ABOUT_TABS)[number]['id'];

const EMPTY_TAB_MESSAGES: Record<AboutTabId, string> = {
  overview:  'Chưa có thông tin tổng quan.',
  personal:  'Chưa có thông tin cá nhân.',
  work:      'Chưa có thông tin công việc.',
  education: 'Chưa có thông tin học vấn.',
  contact:   'Chưa có thông tin liên hệ.',
};

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
  const { profile, isOwnProfile, onEditClick } = useProfileLayoutContext();
  const currentUser = React.useMemo(() => authService.getCurrentUser(), []);
  const [activeTab, setActiveTab] = React.useState<AboutTabId>('overview');

  const userProfile = buildProfileDisplay(profile, {
    currentUser,
    fallbackUserId: profile?.id ?? '',
    preferCurrentUserMedia: isOwnProfile,
  });

  const overviewRows: InfoRowProps[] = [
    hasProfileText(userProfile.bio) && { icon: <MessageSquare className="w-5 h-5" />, label: userProfile.bio.trim(), sub: 'Giới thiệu' },
    hasProfileText(userProfile.location) && { icon: <MapPin className="w-5 h-5" />, label: userProfile.location.trim(), sub: 'Đang sống tại' },
    hasProfileText(userProfile.hometown) && { icon: <Home className="w-5 h-5" />, label: userProfile.hometown.trim(), sub: 'Quê quán' },
    hasProfileText(userProfile.school) && { icon: <GraduationCap className="w-5 h-5" />, label: userProfile.school.trim(), sub: 'Học tại' },
    hasProfileText(userProfile.relationship) && { icon: <Heart className="w-5 h-5" />, label: userProfile.relationship.trim(), sub: 'Tình trạng mối quan hệ' },
    hasProfileText(userProfile.dateOfBirth) && { icon: <Cake className="w-5 h-5" />, label: formatDate(userProfile.dateOfBirth) || '', sub: 'Ngày sinh' },
  ].filter(Boolean) as InfoRowProps[];

  const personalRows: InfoRowProps[] = [
    hasProfileText(userProfile.location) && { icon: <MapPin className="w-5 h-5" />, label: userProfile.location.trim(), sub: 'Tỉnh/thành phố hiện tại' },
    hasProfileText(userProfile.hometown) && { icon: <Home className="w-5 h-5" />, label: userProfile.hometown.trim(), sub: 'Quê quán' },
    hasProfileText(userProfile.dateOfBirth) && { icon: <Cake className="w-5 h-5" />, label: formatDate(userProfile.dateOfBirth) || '', sub: 'Ngày sinh' },
    hasProfileText(userProfile.relationship) && { icon: <Heart className="w-5 h-5" />, label: userProfile.relationship.trim(), sub: 'Tình trạng mối quan hệ' },
    hasProfileText(userProfile.gender) && { icon: <Activity className="w-5 h-5" />, label: userProfile.gender.trim(), sub: 'Giới tính' },
  ].filter(Boolean) as InfoRowProps[];

  const educationRows: InfoRowProps[] = [
    hasProfileText(userProfile.school) && { icon: <GraduationCap className="w-5 h-5" />, label: userProfile.school.trim(), sub: 'Trường học' },
  ].filter(Boolean) as InfoRowProps[];

  const workRows: InfoRowProps[] = [
    hasProfileText(userProfile.workplace) && { icon: <Briefcase className="w-5 h-5" />, label: userProfile.workplace.trim(), sub: 'Nơi làm việc' },
    hasProfileText(userProfile.jobTitle) && { icon: <Briefcase className="w-5 h-5" />, label: userProfile.jobTitle.trim(), sub: 'Chức danh' },
  ].filter(Boolean) as InfoRowProps[];

  const contactRows: InfoRowProps[] = [
    isOwnProfile && hasProfileText(profile?.email) && { icon: <Mail className="w-5 h-5" />, label: profile!.email!.trim(), sub: 'Email' },
  ].filter(Boolean) as InfoRowProps[];

  const tabRows: Record<AboutTabId, InfoRowProps[]> = {
    overview: overviewRows,
    personal: personalRows,
    education: educationRows,
    work: workRows,
    contact: contactRows,
  };

  const currentRows = tabRows[activeTab];

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row min-h-[500px]">

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

        <div className="flex-1 p-6">
          {currentRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                {activeTab === 'work' ? (
                  <Briefcase className="h-7 w-7 text-gray-400" />
                ) : activeTab === 'contact' ? (
                  <Mail className="h-7 w-7 text-gray-400" />
                ) : (
                  <MessageSquare className="h-7 w-7 text-gray-400" />
                )}
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-3">{EMPTY_TAB_MESSAGES[activeTab]}</p>
              {isOwnProfile && (
                <button
                  onClick={onEditClick}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Thêm thông tin
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {currentRows.map((row, i) => (
                <InfoRow key={i} {...row} isOwnProfile={isOwnProfile} onEdit={onEditClick} />
              ))}
              {isOwnProfile && (
                <button
                  onClick={onEditClick}
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
  );
}
