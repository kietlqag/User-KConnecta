import { useEffect, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Image, Ban } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AUTH_USER_CHANGED_EVENT, authService, type AuthUser } from '@/services/authService';
import { CurrentUserAvatar, LiveFeatureIcon, LIVE_NAV_LABEL } from '@/components/shared';
import { prependPostToHomeFeed } from '../../hooks/usePosts';

const ProfileCreatePostModal = lazy(() =>
  import('../../../profile/components/ProfileCreatePost/ProfileCreatePostModal').then((m) => ({
    default: m.ProfileCreatePostModal,
  })),
);
export function CreatePost() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openWithImagePicker, setOpenWithImagePicker] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const [postLocked, setPostLocked] = useState(
    () => authService.getCurrentUser()?.postLocked ?? false,
  );

  const openCreateModal = (withImagePicker: boolean) => {
    setOpenWithImagePicker(withImagePicker);
    setIsModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsModalOpen(false);
    setOpenWithImagePicker(false);
  };

  useEffect(() => {
    const syncAuthUser = () => {
      const u = authService.getCurrentUser();
      setCurrentUser(u);
      setPostLocked(u?.postLocked ?? false);
    };
    window.addEventListener(AUTH_USER_CHANGED_EVENT, syncAuthUser);
    window.addEventListener('storage', syncAuthUser);
    return () => {
      window.removeEventListener(AUTH_USER_CHANGED_EVENT, syncAuthUser);
      window.removeEventListener('storage', syncAuthUser);
    };
  }, []);

  return (
    <>
      <div className="bg-card rounded-xl shadow-sm p-4 mb-4 border border-border">
        {postLocked ? (
          <div className="flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3">
            <Ban className="h-5 w-5 shrink-0 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-400">
              Bạn đang bị tạm cấm đăng bài. Vui lòng thử lại sau khi lệnh cấm hết hạn.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <CurrentUserAvatar />
              <button
                type="button"
                onClick={() => openCreateModal(false)}
                className="flex-1 text-left px-4 py-3 bg-muted hover:bg-muted/80 rounded-full text-muted-foreground transition-colors cursor-pointer"
              >
                Bạn đang nghĩ gì?
              </button>
            </div>

            <div className="border-t border-border my-3" />

            <div className="flex items-center justify-around">
              <Link
                to="/live"
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted transition-colors flex-1 justify-center cursor-pointer"
              >
                <LiveFeatureIcon />
                <span className="text-muted-foreground font-medium hidden sm:inline">{LIVE_NAV_LABEL}</span>
                <span className="text-muted-foreground font-medium sm:hidden">Live</span>
              </Link>

              <button
                type="button"
                onClick={() => openCreateModal(true)}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 transition-colors hover:bg-muted"
              >
                <Image className="w-6 h-6 text-green-500" />
                <span className="text-muted-foreground font-medium hidden sm:inline">Ảnh/video</span>
                <span className="text-muted-foreground font-medium sm:hidden">Ảnh</span>
              </button>
            </div>
          </>
        )}
      </div>

      {isModalOpen ? (
        <Suspense fallback={null}>
          <ProfileCreatePostModal
            isOpen={isModalOpen}
            onClose={closeCreateModal}
            username={currentUser?.fullName || 'Người dùng'}
            initialShowImagePicker={openWithImagePicker}
            onPostCreated={(post) => {
              if (!post.groupId) {
                prependPostToHomeFeed(queryClient, currentUser?.id, post);
              }
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
}
