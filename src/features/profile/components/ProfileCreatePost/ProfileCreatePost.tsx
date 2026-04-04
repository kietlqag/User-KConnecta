import { Image, Video, Smile, MapPin } from 'lucide-react';
import { Link } from 'react-router@7.1.3';

interface ProfileCreatePostProps {
  username: string;
}

export function ProfileCreatePost({ username }: ProfileCreatePostProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <span className="text-sm font-semibold text-white">QK</span>
        </div>
        <button className="flex-1 text-left px-4 py-2 sm:py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-500 dark:text-gray-400 transition-colors text-sm sm:text-base">
          Bạn đang nghĩ gì, {username}?
        </button>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 my-3" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Link
          to="/live"
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors justify-center"
        >
          <Video className="w-6 h-6 text-red-500" />
          <span className="text-gray-600 dark:text-gray-400 font-medium text-sm sm:text-base">Video trực tiếp</span>
        </Link>

        <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors justify-center">
          <Image className="w-6 h-6 text-green-500" />
          <span className="text-gray-600 dark:text-gray-400 font-medium text-sm sm:text-base">Ảnh/video</span>
        </button>

        <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors justify-center">
          <Smile className="w-6 h-6 text-yellow-500" />
          <span className="text-gray-600 dark:text-gray-400 font-medium text-sm sm:text-base">Cột mốc</span>
        </button>

        <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors justify-center">
          <MapPin className="w-6 h-6 text-blue-500" />
          <span className="text-gray-600 dark:text-gray-400 font-medium text-sm sm:text-base">Địa điểm</span>
        </button>
      </div>
    </div>
  );
}
