import { Image, Video, Smile, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileCreatePostProps {
  username: string;
}

export function ProfileCreatePost({ username }: ProfileCreatePostProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      {/* Post Input */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <span className="text-sm font-semibold text-white">QK</span>
        </div>
        <button className="flex-1 text-left px-4 py-2 sm:py-3 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors text-sm sm:text-base">
          Bạn đang nghĩ gì, {username}?
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-3" />

      {/* Action Buttons */}
      <div className="flex items-center justify-around">
        <Link 
          to="/live"
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex-1 justify-center"
        >
          <Video className="w-6 h-6 text-red-500" />
          <span className="text-gray-600 font-medium text-sm sm:text-base">Video trực tiếp</span>
        </Link>
        
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex-1 justify-center">
          <Image className="w-6 h-6 text-green-500" />
          <span className="text-gray-600 font-medium text-sm sm:text-base">Ảnh/video</span>
        </button>
        
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex-1 justify-center">
          <Smile className="w-6 h-6 text-yellow-500" />
          <span className="text-gray-600 font-medium text-sm sm:text-base">Cốt mốc</span>
        </button>
        
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex-1 justify-center">
          <MapPin className="w-6 h-6 text-blue-500" />
          <span className="text-gray-600 font-medium text-sm sm:text-base">Địa điểm</span>
        </button>
      </div>
    </div>
  );
}