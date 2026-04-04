import { Camera, Plus, Edit, ChevronDown, MoreHorizontal } from 'lucide-react';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';

interface ProfileHeaderProps {
  coverPhoto: string;
  avatar: string;
  fullName: string;
  username?: string;
  friendsCount: number;
  location?: string;
  school?: string;
  isOwnProfile?: boolean;
  onEditClick?: () => void;
}

export function ProfileHeader({
  coverPhoto,
  avatar,
  fullName,
  username,
  friendsCount,
  location,
  school,
  isOwnProfile = true,
  onEditClick,
}: ProfileHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-[1100px] mx-auto">
        {/* Cover Photo Area */}
        <div className="relative h-[250px] md:h-[350px] w-full rounded-b-xl overflow-hidden bg-gray-200 dark:bg-gray-700 group/cover">
          <ImageWithFallback
            src={coverPhoto}
            alt="Cover photo"
            className="w-full h-full object-cover"
          />
          {isOwnProfile && (
            <button 
              onClick={onEditClick}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 rounded-lg shadow-sm font-medium transition-colors text-sm"
            >
              <Camera className="w-4 h-4" />
              Chỉnh sửa ảnh bìa
            </button>
          )}
        </div>

        {/* Profile Info Area */}
        <div className="px-4 pb-4 pt-1">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-4 -mt-8 md:-mt-12 lg:-mt-16">
            {/* Avatar - overlaps cover photo */}
            <div className="relative group/avatar flex-shrink-0">
              <div className="w-[168px] h-[168px] rounded-full border-[5px] border-white dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
                <ImageWithFallback
                  src={avatar}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              </div>
              {isOwnProfile && (
                <button 
                  onClick={onEditClick}
                  className="absolute bottom-3 right-3 w-9 h-9 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors border-2 border-white dark:border-gray-800 shadow-sm"
                >
                  <Camera className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
              )}
            </div>

            {/* Name and Basic Info */}
            <div className="flex-1 min-w-0 text-center md:text-left mb-2 md:pb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center justify-center md:justify-start gap-2">
                {fullName}
                {username && <span className="text-gray-500 dark:text-gray-400 font-normal text-2xl">({username})</span>}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 font-semibold mt-1">
                {friendsCount} người bạn
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mb-2 md:pb-2">
              {isOwnProfile ? (
                <>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-[15px]">
                    <Plus className="w-5 h-5" />
                    Thêm vào tin
                  </button>
                  <button 
                    onClick={onEditClick}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium text-[15px]"
                  >
                    <Edit className="w-4 h-4 text-gray-900 dark:text-white" />
                    Chỉnh sửa trang cá nhân
                  </button>
                  <button className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors">
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
                    Thêm bạn bè
                  </button>
                  <button className="flex items-center gap-2 px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium">
                    Nhắn tin
                  </button>
                  <button className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}