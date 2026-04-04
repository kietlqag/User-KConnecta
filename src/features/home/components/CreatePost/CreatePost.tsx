import { useState } from 'react';
import { Image, Video, Smile } from 'lucide-react';
import { Link } from 'react-router@7.1.3';
import { ProfileCreatePostModal } from '../../../profile/components/ProfileCreatePost/ProfileCreatePostModal';

export function CreatePost() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <span className="text-sm font-semibold text-white">QK</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 text-left px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors cursor-pointer"
          >
            Bạn đang nghĩ gì?
          </button>
        </div>

        <div className="border-t border-gray-200 my-3" />

        <div className="flex items-center justify-around">
          <Link
            to="/live"
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex-1 justify-center cursor-pointer"
          >
            <Video className="w-6 h-6 text-red-500" />
            <span className="text-gray-600 font-medium hidden sm:inline">Video trực tiếp</span>
            <span className="text-gray-600 font-medium sm:hidden">Video</span>
          </Link>

          <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex-1 justify-center cursor-pointer">
            <Image className="w-6 h-6 text-green-500" />
            <span className="text-gray-600 font-medium hidden sm:inline">Ảnh/video</span>
            <span className="text-gray-600 font-medium sm:hidden">Ảnh</span>
          </button>

          <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex-1 justify-center cursor-pointer">
            <Smile className="w-6 h-6 text-yellow-500" />
            <span className="text-gray-600 font-medium hidden sm:inline">Cảm xúc/hoạt động</span>
            <span className="text-gray-600 font-medium sm:hidden">Cảm xúc</span>
          </button>
        </div>
      </div>

      <ProfileCreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        username="Quốc Kiệt"
      />
    </>
  );
}
