import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Image, Video, Smile } from 'lucide-react';
import { ProfileCreatePostModal } from '../../../profile/components/ProfileCreatePost/ProfileCreatePostModal';
import { AUTH_USER_CHANGED_EVENT, authService, type AuthUser } from '@/services/authService';
import { CurrentUserAvatar } from '@/components/shared';

export function CreatePost() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openWithImagePicker, setOpenWithImagePicker] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());

  const openCreateModal = (withImagePicker: boolean) => {
    setOpenWithImagePicker(withImagePicker);
    setIsModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsModalOpen(false);
    setOpenWithImagePicker(false);
  };

  useEffect(() => {
    const syncAuthUser = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener(AUTH_USER_CHANGED_EVENT, syncAuthUser);
    window.addEventListener('storage', syncAuthUser);
    return () => {
      window.removeEventListener(AUTH_USER_CHANGED_EVENT, syncAuthUser);
      window.removeEventListener('storage', syncAuthUser);
    };
  }, []);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <CurrentUserAvatar />

          <button
            type="button"
            onClick={() => openCreateModal(false)}
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

          <button
            type="button"
            onClick={() => openCreateModal(true)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 transition-colors hover:bg-gray-100"
          >
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
        onClose={closeCreateModal}
        username={currentUser?.fullName || 'Người dùng'}
        initialShowImagePicker={openWithImagePicker}
      />
    </>
  );
}
