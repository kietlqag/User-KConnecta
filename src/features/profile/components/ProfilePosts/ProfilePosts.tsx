import { useMemo, useState } from 'react';
import { Grid3x3, List, FileText, Loader2, X, ChevronLeft, ChevronRight, Play, Images } from 'lucide-react';
import type { FeedPost } from '@/utils/postUtils';
import { Post } from '../../../../components/shared/Post';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';

interface GridTile {
  postId: string;
  type: 'image' | 'video';
  url: string;
  allImages: string[];
  extraImageCount: number;
}

function getPostGridTile(post: FeedPost): GridTile | null {
  const allImages = [
    ...(post.mediaList?.filter((m) => m.type === 'IMAGE' && m.url?.trim()).map((m) => m.url) ?? []),
    ...(post.image?.trim() && !post.mediaList?.length ? [post.image] : []),
  ].filter(Boolean) as string[];

  const videoUrl =
    post.mediaList?.find((m) => m.type === 'VIDEO' && m.url?.trim())?.url ??
    (post.media?.type === 'video' && post.media.url?.trim() ? post.media.url : null);

  if (allImages.length > 0) {
    return {
      postId: post.id,
      type: 'image',
      url: allImages[0],
      allImages,
      extraImageCount: Math.max(0, allImages.length - 1),
    };
  }

  if (videoUrl) {
    return {
      postId: post.id,
      type: 'video',
      url: videoUrl,
      allImages: [],
      extraImageCount: 0,
    };
  }

  return null;
}

interface ProfilePostsProps {
  posts: FeedPost[];
  loading?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

function PostSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 animate-pulse">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-full" />
          <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-4/5" />
        </div>
      </div>
      <div className="h-48 bg-gray-200 dark:bg-gray-700" />
      <div className="p-4 flex justify-between">
        <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

export function ProfilePosts({ posts, loading = false, hasMore = false, loadingMore = false, onLoadMore }: ProfilePostsProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const gridTiles = useMemo(
    () =>
      posts
        .map(getPostGridTile)
        .filter((tile): tile is GridTile => tile !== null),
    [posts],
  );

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxImages([]);
    document.body.style.overflow = '';
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIndex(i => (i === 0 ? lightboxImages.length - 1 : i - 1));
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIndex(i => (i === lightboxImages.length - 1 ? 0 : i + 1));
  };

  if (loading) {
    return (
      <div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-4">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="h-6 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
        </div>
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bài viết</h2>
        </div>

        <div className="grid grid-cols-2">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
              viewMode === 'list'
                ? 'text-blue-600 dark:text-blue-400 border-b-4 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <List className="w-4 h-4" />
            Danh sách
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
              viewMode === 'grid'
                ? 'text-blue-600 dark:text-blue-400 border-b-4 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
            Lưới
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-12 flex flex-col items-center text-center">
          <div className="relative mb-4 h-20 w-20">
            <div className="absolute inset-0 rotate-6 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <FileText className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">Chưa có bài viết nào</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Các bài viết sẽ xuất hiện ở đây.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <Post key={post.id} {...post} />
          ))}
          {hasMore && (
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tải...
                </>
              ) : (
                'Xem thêm bài viết'
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {gridTiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="relative mb-4 h-16 w-16">
                <div className="absolute inset-0 rotate-6 rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                  <Images className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Không có bài viết có ảnh hoặc video
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Chuyển sang danh sách để xem bài viết dạng chữ.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-1 p-1 sm:gap-1.5 sm:p-1.5">
                {gridTiles.map((tile) => (
                  <button
                    key={tile.postId}
                    type="button"
                    className="group relative aspect-square w-full min-w-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    onClick={() => {
                      if (tile.type === 'image' && tile.allImages.length > 0) {
                        openLightbox(tile.allImages, 0);
                      }
                    }}
                  >
                    {tile.type === 'image' ? (
                      <ImageWithFallback
                        src={tile.url}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <>
                        <video
                          src={tile.url}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-lg">
                            <Play className="ml-0.5 h-5 w-5 fill-white" />
                          </span>
                        </span>
                      </>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/20" />
                    {tile.extraImageCount > 0 && (
                      <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                        <Images className="h-3 w-3" />
                        +{tile.extraImageCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {hasMore && (
                <div className="border-t border-gray-200 p-3 dark:border-gray-700">
                  <button
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải...
                      </>
                    ) : (
                      'Xem thêm bài viết'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {lightboxImages.length > 0 && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            onClick={closeLightbox}
          >
            <X className="w-7 h-7" />
          </button>

          {lightboxImages.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                onClick={prevImage}
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                onClick={nextImage}
              >
                <ChevronRight className="w-8 h-8" />
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm font-medium px-3 py-1 rounded-full">
                {lightboxIndex + 1} / {lightboxImages.length}
              </span>
            </>
          )}

          <img
            src={lightboxImages[lightboxIndex]}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
