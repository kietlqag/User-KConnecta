import { useState } from 'react';
import { Image } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProfileCreatePostModal } from './ProfileCreatePostModal';
import { CurrentUserAvatar, LiveFeatureIcon, LIVE_NAV_LABEL } from '@/components/shared';
import type { PostResponse } from '@/services/postService';

interface ProfileCreatePostProps {
  username: string;
  onPostCreated?: (post: PostResponse) => void;
}

export function ProfileCreatePost({ username, onPostCreated }: ProfileCreatePostProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialShowImagePicker, setInitialShowImagePicker] = useState(false);

  const handleOpenModal = (showImagePicker = false) => {
    setInitialShowImagePicker(showImagePicker);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setInitialShowImagePicker(false);
  };

  return (
    <>
      <div className="bg-card rounded-2xl border border-border shadow-sm dark:shadow-none p-4">
        <div className="flex items-center gap-3 mb-4">
          <CurrentUserAvatar />
          <button
            onClick={() => handleOpenModal(false)}
            className="flex-1 text-left px-4 py-2 sm:py-3 bg-muted hover:bg-muted/80 rounded-full text-muted-foreground transition-colors text-sm sm:text-base cursor-pointer"
          >
            Bạn đang nghĩ gì, {username}?
          </button>
        </div>

        <div className="border-t border-border my-3" />

        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/live"
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors justify-center"
          >
            <LiveFeatureIcon />
            <span className="text-muted-foreground font-medium text-sm sm:text-base">
              {LIVE_NAV_LABEL}
            </span>
          </Link>

          <button 
            onClick={() => handleOpenModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors justify-center cursor-pointer"
          >
            <Image className="w-6 h-6 text-green-500" />
            <span className="text-muted-foreground font-medium text-sm sm:text-base">
              Ảnh/video
            </span>
          </button>


        </div>
      </div>

      <ProfileCreatePostModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        username={username}
        onPostCreated={onPostCreated}
        initialShowImagePicker={initialShowImagePicker}
      />
    </>
  );
}
