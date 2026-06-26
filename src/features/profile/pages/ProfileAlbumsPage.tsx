import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, Images, Loader2 } from 'lucide-react';
import { useMyAlbums, useUserAlbums } from '@/features/albums/hooks/useAlbums';
import type { Album } from '@/services/albumService';
import { ProfileAlbumCard } from '../components/ProfileAlbumCard';
import { useProfileLayoutContext } from './ProfileLayout';
import { logProfileTabError, useProfileTabDebug } from '../utils/profileTabLogger';

const PAGE_SIZE = 24;

function AlbumSkeleton() {
  return <div className="aspect-square rounded-xl bg-gray-200 animate-pulse dark:bg-gray-700" />;
}

function filterPersonalAlbums(albums: Album[]) {
  return albums.filter((album) => !album.groupId);
}

export function ProfileAlbumsPage() {
  const navigate = useNavigate();
  const { resolvedId, isOwnProfile, loading: profileLoading } = useProfileLayoutContext();
  useProfileTabDebug('albums', resolvedId);

  const [page, setPage] = React.useState(0);
  const [items, setItems] = React.useState<Album[]>([]);
  const [hasMore, setHasMore] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const myQuery = useMyAlbums(page, PAGE_SIZE);
  const userQuery = useUserAlbums(isOwnProfile ? undefined : resolvedId, page, PAGE_SIZE);

  const activeQuery = isOwnProfile ? myQuery : userQuery;
  const isLoading = profileLoading || (page === 0 && activeQuery.isLoading);

  React.useEffect(() => {
    setPage(0);
    setItems([]);
    setHasMore(false);
  }, [resolvedId, isOwnProfile]);

  React.useEffect(() => {
    const data = activeQuery.data;
    if (!data) return;

    const nextItems = filterPersonalAlbums(data.content);
    setItems((prev) => (page === 0 ? nextItems : [...prev, ...nextItems]));
    setHasMore(data.number + 1 < data.totalPages);
  }, [activeQuery.data, page]);

  React.useEffect(() => {
    if (!activeQuery.error) return;
    logProfileTabError('albums', 'load-albums', activeQuery.error, {
      resolvedId,
      isOwnProfile,
      page,
    });
  }, [activeQuery.error, resolvedId, isOwnProfile, page]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      setPage((prev) => prev + 1);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Images className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Album
              {!isLoading && (
                <span className="ml-2 text-base font-normal text-gray-500 dark:text-gray-400">
                  · {items.length}
                </span>
              )}
            </h2>
          </div>
          {isOwnProfile && (
            <button
              type="button"
              onClick={() => navigate('/albums/create')}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <ImagePlus className="h-4 w-4" />
              Tạo album
            </button>
          )}
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <AlbumSkeleton key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-4 h-20 w-20">
                <div className="absolute inset-0 rotate-6 rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                  <Images className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-gray-200">
                {isOwnProfile ? 'Chưa có album nào' : 'Không có album để hiển thị'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isOwnProfile
                  ? 'Tạo album để sắp xếp ảnh và video kỷ niệm của bạn.'
                  : 'Người dùng này chưa chia sẻ album công khai hoặc bạn không có quyền xem.'}
              </p>
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => navigate('/albums/create')}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <ImagePlus className="h-4 w-4" />
                  Tạo album đầu tiên
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((album) => (
                  <ProfileAlbumCard
                    key={album.id}
                    album={album}
                    showPrivacy={isOwnProfile}
                    onOpen={() => navigate(`/albums/${album.id}`)}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore || activeQuery.isFetching}
                    className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-6 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    {(loadingMore || activeQuery.isFetching) && page > 0 ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải...
                      </>
                    ) : (
                      'Tải thêm album'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
