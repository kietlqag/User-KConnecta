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
}: ProfileHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow">
      {/* Compact Header without large cover photo */}
      <div className="max-w-[1100px] mx-auto px-4 py-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-[168px] h-[168px] rounded-full border-4 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
              <ImageWithFallback
                src={avatar}
                alt={fullName}
                className="w-full h-full object-cover"
              />
            </div>
            {isOwnProfile && (
              <button className="absolute bottom-2 right-2 w-9 h-9 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors border-2 border-white dark:border-gray-800">
                <Camera className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
            )}
          </div>

          {/* Info and Actions */}
          <div className="flex-1 min-w-0 pt-2">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fullName} {username && <span className="text-gray-500 dark:text-gray-400 text-2xl">({username})</span>}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{friendsCount} người bạn</p>
              </div>
              
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <MoreHorizontal className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {(location || school) && (
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                {school && (
                  <span className="flex items-center gap-1">
                    🎓 Học tại {school}
                  </span>
                )}
                {location && (
                  <span className="flex items-center gap-1">
                    📍 Sống tại {location}
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isOwnProfile ? (
                <>
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium">
                    <Plus className="w-4 h-4" />
                    Thêm vào tin
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium">
                    <Edit className="w-4 h-4" />
                    Chỉnh sửa trang cá nhân
                  </button>
                  <button className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors">
                    <ChevronDown className="w-5 h-5 text-gray-900 dark:text-white" />
                  </button>
                </>
              ) : (
                <>
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium">
                    Thêm bạn bè
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium">
                    Nhắn tin
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