import { useState } from 'react';
import { Image, Video, Smile, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProfileCreatePostModal } from './ProfileCreatePostModal';
import { CurrentUserAvatar } from '@/components/shared';

interface ProfileCreatePostProps {
  username: string;
  onPostCreated?: () => void;
}

export function ProfileCreatePost({ username, onPostCreated }: ProfileCreatePostProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
        <div className="flex items-center gap-3 mb-4">
          <CurrentUserAvatar />
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 text-left px-4 py-2 sm:py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-500 dark:text-gray-400 transition-colors text-sm sm:text-base"
          >
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
            <span className="text-gray-600 dark:text-gray-400 font-medium text-sm sm:text-base">
              Video trực tiếp
            </span>
          </Link>

          <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors justify-center">
            <Image className="w-6 h-6 text-green-500" />
            <span className="text-gray-600 dark:text-gray-400 font-medium text-sm sm:text-base">
              Ảnh/video
            </span>
          </button>

          <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors justify-center">
            <Smile className="w-6 h-6 text-yellow-500" />
            <span className="text-gray-600 dark:text-gray-400 font-medium text-sm sm:text-base">
              Cảm xúc
            </span>
          </button>

          <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors justify-center">
            <MapPin className="w-6 h-6 text-blue-500" />
            <span className="text-gray-600 dark:text-gray-400 font-medium text-sm sm:text-base">
              Địa điểm
            </span>
          </button>
        </div>
      </div>

      <ProfileCreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        username={username}
        onPostCreated={onPostCreated}
      />
    </>
  );
}
