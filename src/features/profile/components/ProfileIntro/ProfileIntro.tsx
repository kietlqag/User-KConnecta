import { MapPin, Home, Heart, Edit2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';

interface ProfileIntroProps {
  location?: string;
  hometown?: string;
  relationship?: string;
  school?: string;
  featuredPhotos?: Array<{ id: string; url: string; count?: number }>;
  isOwnProfile?: boolean;
}

export function ProfileIntro({
  location,
  hometown,
  relationship,
  school,
  featuredPhotos = [],
  isOwnProfile = true,
}: ProfileIntroProps) {
  return (
    <div className="space-y-4">
      {/* Intro Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Thông tin cá nhân</h2>
          {isOwnProfile && (
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          {location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-gray-900 dark:text-white">Sống ở </span>
                <span className="font-semibold text-gray-900 dark:text-white">{location}</span>
              </div>
            </div>
          )}

          {hometown && (
            <div className="flex items-start gap-3">
              <Home className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-gray-900 dark:text-white">Từ </span>
                <span className="font-semibold text-gray-900 dark:text-white">{hometown}</span>
              </div>
            </div>
          )}

          {relationship && (
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-gray-900 dark:text-white">{relationship}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Education Card */}
      {school && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Học vấn</h2>
            {isOwnProfile && (
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">🎓</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">{school}</p>
              <button className="text-sm text-gray-600 dark:text-gray-400 hover:underline mt-1">
                Xem thêm học vấn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Featured Photos Card */}
      {featuredPhotos.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tin nổi bật</h2>
            {isOwnProfile && (
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {featuredPhotos.slice(0, 3).map((photo, index) => (
              <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer">
                <ImageWithFallback
                  src={photo.url}
                  alt={`Featured ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                {photo.count && (
                  <div className="absolute top-1 right-1 bg-gray-800/80 text-white text-xs px-1.5 py-0.5 rounded">
                    +{photo.count}
                  </div>
                )}
              </div>
            ))}
          </div>

          {isOwnProfile && (
            <button className="w-full mt-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-white font-medium transition-colors">
              Chỉnh sửa tin nổi bật
            </button>
          )}
        </div>
      )}

      {/* Friends Preview - Will be added later */}
    </div>
  );
}