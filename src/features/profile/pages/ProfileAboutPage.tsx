import * as React from 'react';
import {
  MapPin, Home, Cake, Heart, GraduationCap, Activity,
  MessageSquare, Mail, Briefcase, Edit2, Phone, Globe,
} from 'lucide-react';
import { authService } from '@/services/authService';
import { buildProfileDisplay, hasProfileText } from '../utils/profileDisplayUtils';
import { useProfileLayoutContext } from './ProfileLayout';

const ABOUT_TABS = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'personal', label: 'Thông tin cá nhân' },
  { id: 'work', label: 'Công việc' },
  { id: 'education', label: 'Trình độ học vấn' },
  { id: 'contact', label: 'Thông tin liên hệ' },
] as const;

type AboutTabId = (typeof ABOUT_TABS)[number]['id'];

const EMPTY_TAB_MESSAGES: Record<AboutTabId, string> = {
  overview: 'Chưa có thông tin tổng quan.',
  personal: 'Chưa có thông tin cá nhân.',
  work: 'Chưa có thông tin công việc.',
  education: 'Chưa có thông tin học vấn.',
  contact: 'Chưa có thông tin liên hệ.',
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
}

function InfoRow({ icon, label, sub }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gray-500 dark:text-gray-400">{icon}</div>
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
      </div>
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
    hasProfileText(userProfile.bio) && { icon: <MessageSquare className="h-5 w-5" />, label: userProfile.bio.trim(), sub: 'Giới thiệu' },
    hasProfileText(userProfile.location) && { icon: <MapPin className="h-5 w-5" />, label: userProfile.location.trim(), sub: 'Đang sống tại' },
    hasProfileText(userProfile.hometown) && { icon: <Home className="h-5 w-5" />, label: userProfile.hometown.trim(), sub: 'Quê quán' },
    hasProfileText(userProfile.school) && { icon: <GraduationCap className="h-5 w-5" />, label: userProfile.school.trim(), sub: 'Học tại' },
    hasProfileText(userProfile.relationship) && { icon: <Heart className="h-5 w-5" />, label: userProfile.relationship.trim(), sub: 'Tình trạng mối quan hệ' },
    hasProfileText(userProfile.dateOfBirth) && { icon: <Cake className="h-5 w-5" />, label: formatDate(userProfile.dateOfBirth) || '', sub: 'Ngày sinh' },
  ].filter(Boolean) as InfoRowProps[];

  const personalRows: InfoRowProps[] = [
    hasProfileText(userProfile.location) && { icon: <MapPin className="h-5 w-5" />, label: userProfile.location.trim(), sub: 'Tỉnh/thành phố hiện tại' },
    hasProfileText(userProfile.hometown) && { icon: <Home className="h-5 w-5" />, label: userProfile.hometown.trim(), sub: 'Quê quán' },
    hasProfileText(userProfile.dateOfBirth) && { icon: <Cake className="h-5 w-5" />, label: formatDate(userProfile.dateOfBirth) || '', sub: 'Ngày sinh' },
    hasProfileText(userProfile.relationship) && { icon: <Heart className="h-5 w-5" />, label: userProfile.relationship.trim(), sub: 'Tình trạng mối quan hệ' },
    hasProfileText(userProfile.gender) && { icon: <Activity className="h-5 w-5" />, label: userProfile.gender.trim(), sub: 'Giới tính' },
  ].filter(Boolean) as InfoRowProps[];

  const educationRows: InfoRowProps[] = [
    hasProfileText(userProfile.school) && { icon: <GraduationCap className="h-5 w-5" />, label: userProfile.school.trim(), sub: 'Trường học' },
  ].filter(Boolean) as InfoRowProps[];

  const workRows: InfoRowProps[] = [
    hasProfileText(userProfile.workplace) && { icon: <Briefcase className="h-5 w-5" />, label: userProfile.workplace.trim(), sub: 'Nơi làm việc' },
    hasProfileText(userProfile.jobTitle) && { icon: <Briefcase className="h-5 w-5" />, label: userProfile.jobTitle.trim(), sub: 'Chức danh' },
  ].filter(Boolean) as InfoRowProps[];

  const contactRows: InfoRowProps[] = [
    hasProfileText(userProfile.phoneNumber) && { icon: <Phone className="h-5 w-5" />, label: userProfile.phoneNumber.trim(), sub: 'Số điện thoại' },
    hasProfileText(userProfile.website) && {
      icon: <Globe className="h-5 w-5" />,
      label: userProfile.website.trim().replace(/^https?:\/\//, ''),
      sub: 'Website',
    },
    isOwnProfile && hasProfileText(profile?.email) && { icon: <Mail className="h-5 w-5" />, label: profile!.email!.trim(), sub: 'Email' },
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
    <div className="mx-auto max-w-[1100px] px-4 py-6">
      <div className="flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none md:flex-row">
        <div className="w-full flex-shrink-0 border-b border-gray-200 pt-4 dark:border-gray-700 md:w-[260px] md:border-b-0 md:border-r">
          <div className="mb-3 flex items-center justify-between px-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Giới thiệu</h2>
            {isOwnProfile && (
              <button
                type="button"
                onClick={onEditClick}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                aria-label="Chỉnh sửa giới thiệu"
                title="Chỉnh sửa giới thiệu"
              >
                <Edit2 className="h-5 w-5" />
              </button>
            )}
          </div>
          <nav className="space-y-1 px-3 pb-4">
            {ABOUT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-[15px] font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 p-6">
          {currentRows.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                {activeTab === 'work' ? (
                  <Briefcase className="h-7 w-7 text-gray-400" />
                ) : activeTab === 'contact' ? (
                  <Mail className="h-7 w-7 text-gray-400" />
                ) : (
                  <MessageSquare className="h-7 w-7 text-gray-400" />
                )}
              </div>
              <p className="text-gray-500 dark:text-gray-400">{EMPTY_TAB_MESSAGES[activeTab]}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {currentRows.map((row, i) => (
                <InfoRow key={i} {...row} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
