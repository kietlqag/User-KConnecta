import { MapPin, Home, Heart, Edit2, Plus } from 'lucide-react';
import { Link } from 'react-router@7.1.3';
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
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Thông tin cá nhân</h2>
          {isOwnProfile && (
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Edit2 className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          {location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-gray-900">Sống ở </span>
                <span className="font-semibold text-gray-900">{location}</span>
              </div>
            </div>
          )}

          {hometown && (
            <div className="flex items-start gap-3">
              <Home className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-gray-900">Từ </span>
                <span className="font-semibold text-gray-900">{hometown}</span>
              </div>
            </div>
          )}

          {relationship && (
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-gray-900">{relationship}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Education Card */}
      {school && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Học vấn</h2>
            {isOwnProfile && (
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Edit2 className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">🎓</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{school}</p>
              <button className="text-sm text-gray-600 hover:underline mt-1">
                Xem thêm học vấn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Featured Photos Card */}
      {featuredPhotos.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Tin nổi bật</h2>
            {isOwnProfile && (
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Edit2 className="w-4 h-4 text-gray-600" />
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
            <button className="w-full mt-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors">
              Chỉnh sửa tin nổi bật
            </button>
          )}
        </div>
      )}

      {/* Friends Preview - Will be added later */}
    </div>
  );
}