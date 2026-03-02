import { Camera, Plus, Edit, ChevronDown, MoreHorizontal } from 'lucide-react';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';

interface ProfileHeaderProps {
  coverPhoto: string;
  avatar: string;
  name: string;
  username?: string;
  friendsCount: number;
  location?: string;
  school?: string;
  isOwnProfile?: boolean;
}

export function ProfileHeader({
  coverPhoto,
  avatar,
  name,
  username,
  friendsCount,
  location,
  school,
  isOwnProfile = true,
}: ProfileHeaderProps) {
  return (
    <div className="bg-white shadow">
      {/* Compact Header without large cover photo */}
      <div className="max-w-[1100px] mx-auto px-4 py-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-[168px] h-[168px] rounded-full border-4 border-gray-200 bg-white overflow-hidden">
              <ImageWithFallback
                src={avatar}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
            {isOwnProfile && (
              <button className="absolute bottom-2 right-2 w-9 h-9 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors border-2 border-white">
                <Camera className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Info and Actions */}
          <div className="flex-1 min-w-0 pt-2">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {name} {username && <span className="text-gray-500 text-2xl">({username})</span>}
                </h1>
                <p className="text-gray-600 mt-1">{friendsCount} người bạn</p>
              </div>
              
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreHorizontal className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {(location || school) && (
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600 mb-4">
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
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium">
                    <Plus className="w-4 h-4" />
                    Thêm vào tin
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium">
                    <Edit className="w-4 h-4" />
                    Chỉnh sửa trang cá nhân
                  </button>
                  <button className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium">
                    Thêm bạn bè
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium">
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