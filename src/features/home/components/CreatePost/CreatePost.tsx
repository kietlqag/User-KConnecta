import { useEffect, useState } from 'react';
import { ProfileCreatePostModal } from '../../../profile/components/ProfileCreatePost/ProfileCreatePostModal';
import { AUTH_USER_CHANGED_EVENT, authService, type AuthUser } from '@/services/authService';
import { CurrentUserAvatar } from '@/components/shared';

export function CreatePost() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());

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
            onClick={() => setIsModalOpen(true)}
            className="flex-1 text-left px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors cursor-pointer"
          >
            Bạn đang nghĩ gì?
          </button>
        </div>
      </div>

      <ProfileCreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        username={currentUser?.fullName || 'Người dùng'}
      />
    </>
  );
}
