import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clapperboard, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { postService, SAVED_POSTS_CHANGED_EVENT } from '@/services/postService';
import { mapPostsToReels } from '@/features/watch/utils/mapPostToReel';
import type { Reel } from '@/features/watch/types/watch.types';
import { useProfileLayoutContext } from './ProfileLayout';
import {
  fetchAllUserPosts,
  isAbortError,
} from '../utils/profilePhotoUtils';

type ReelsTab = 'yours' | 'saved';

function ReelSkeleton() {
  return <div className="aspect-[9/16] rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />;
}

function ReelsGrid({
  reels,
  showUnsave,
  onUnsave,
  onOpen,
}: {
  reels: Reel[];
  showUnsave?: boolean;
  onUnsave?: (postId: string) => void;
  onOpen: (postId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {reels.map((reel) => (
        <div
          key={reel.id}
          className="group relative aspect-[9/16] cursor-pointer overflow-hidden rounded-xl bg-gray-900"
          onClick={() => onOpen(reel.id)}
        >
          <video
            src={reel.videoUrl}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            muted
            preload="metadata"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
            <div className="absolute bottom-2 left-2 right-2">
              <p className="line-clamp-2 text-xs font-semibold leading-tight text-white">
                {reel.caption || 'Thước phim'}
              </p>
            </div>
          </div>
          {showUnsave && onUnsave && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUnsave(reel.id);
              }}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
              title="Bỏ lưu"
            >
              <Bookmark className="h-4 w-4 fill-white" />
            </button>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <div className="rounded-full bg-black/40 p-3">
              <Play className="h-6 w-6 fill-white text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileReelsPage() {
  const navigate = useNavigate();
  const { resolvedId, isOwnProfile, loading: profileLoading } = useProfileLayoutContext();
  const currentUser = React.useMemo(() => authService.getCurrentUser(), []);

  const [activeTab, setActiveTab] = React.useState<ReelsTab>('yours');
  const [yourReels, setYourReels] = React.useState<Reel[]>([]);
  const [savedReels, setSavedReels] = React.useState<Reel[]>([]);
  const [loadingYours, setLoadingYours] = React.useState(true);
  const [loadingSaved, setLoadingSaved] = React.useState(false);

  const loadYourReels = React.useCallback(async (signal?: AbortSignal) => {
    if (!resolvedId) return;
    setLoadingYours(true);
    try {
      const posts = await fetchAllUserPosts(resolvedId, currentUser?.id, signal);
      setYourReels(mapPostsToReels(posts));
    } catch (error) {
      if (!isAbortError(error)) setYourReels([]);
    } finally {
      if (!signal?.aborted) setLoadingYours(false);
    }
  }, [resolvedId, currentUser?.id]);

  const loadSavedReels = React.useCallback(async () => {
    if (!currentUser?.id || !isOwnProfile) return;
    setLoadingSaved(true);
    try {
      const posts = await postService.getSavedPosts(currentUser.id);
      setSavedReels(mapPostsToReels(posts));
    } catch {
      setSavedReels([]);
    } finally {
      setLoadingSaved(false);
    }
  }, [currentUser?.id, isOwnProfile]);

  React.useEffect(() => {
    const controller = new AbortController();
    void loadYourReels(controller.signal);
    return () => controller.abort();
  }, [loadYourReels]);

  React.useEffect(() => {
    if (!isOwnProfile) return;
    void loadSavedReels();
  }, [isOwnProfile, loadSavedReels]);

  React.useEffect(() => {
    if (!isOwnProfile) return;

    const handleSavedChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ postId: string; saved: boolean }>).detail;
      if (!detail) return;

      if (detail.saved) {
        void loadSavedReels();
        return;
      }

      setSavedReels((prev) => prev.filter((reel) => reel.id !== detail.postId));
    };

    window.addEventListener(SAVED_POSTS_CHANGED_EVENT, handleSavedChanged);
    return () => window.removeEventListener(SAVED_POSTS_CHANGED_EVENT, handleSavedChanged);
  }, [isOwnProfile, loadSavedReels]);

  const handleUnsave = async (postId: string) => {
    if (!currentUser?.id) return;
    try {
      await postService.unsavePost(currentUser.id, postId);
      setSavedReels((prev) => prev.filter((reel) => reel.id !== postId));
      window.dispatchEvent(
        new CustomEvent(SAVED_POSTS_CHANGED_EVENT, { detail: { postId, saved: false } }),
      );
      toast.success('Đã bỏ lưu thước phim');
    } catch {
      toast.error('Không thể bỏ lưu thước phim');
    }
  };

  const tabs: { key: ReelsTab; label: string }[] = isOwnProfile
    ? [
        { key: 'yours', label: 'Thước phim của bạn' },
        { key: 'saved', label: 'Thước phim đã lưu' },
      ]
    : [{ key: 'yours', label: 'Thước phim' }];

  const reels = activeTab === 'saved' ? savedReels : yourReels;
  const isLoadingContent =
    profileLoading || (activeTab === 'saved' ? loadingSaved : loadingYours);

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Clapperboard className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Watch</h2>
          </div>
        </div>

        {tabs.length > 1 && (
          <div className="flex border-b border-gray-200 px-2 dark:border-gray-700">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'border-transparent text-gray-600 hover:bg-muted dark:text-gray-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="p-5">
          {isLoadingContent ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <ReelSkeleton key={i} />
              ))}
            </div>
          ) : reels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-4 h-20 w-20">
                <div className="absolute inset-0 rotate-6 rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                  {activeTab === 'saved' ? (
                    <Play className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                  ) : (
                    <Clapperboard className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
              </div>
              <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-gray-200">
                {activeTab === 'saved' ? 'Chưa có thước phim đã lưu' : 'Chưa có thước phim nào'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {activeTab === 'saved'
                  ? 'Khi bạn lưu video trên Watch, chúng sẽ xuất hiện ở đây.'
                  : 'Các video từ bài viết sẽ xuất hiện ở đây.'}
              </p>
              {activeTab === 'saved' && (
                <button
                  type="button"
                  onClick={() => navigate('/watch')}
                  className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Khám phá Watch
                </button>
              )}
            </div>
          ) : (
            <ReelsGrid
              reels={reels}
              showUnsave={activeTab === 'saved'}
              onUnsave={handleUnsave}
              onOpen={(postId) => navigate(`/watch?id=${postId}`)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
