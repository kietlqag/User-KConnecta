import { useState } from 'react';
import { Grid3x3, List, FileText, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { FeedPost } from '@/utils/postUtils';
import { Post } from '../../../../components/shared/Post';

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

  const gridPosts = posts.filter(p => p.mediaList && p.mediaList.length > 0 || p.image || p.media?.url);

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
          {gridPosts.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Không có bài viết có ảnh để hiển thị ở chế độ lưới.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 bg-gray-200 dark:bg-gray-700">
              {gridPosts.map((post) => {
                const allImages = [
                  ...(post.mediaList?.filter(m => m.type === 'IMAGE').map(m => m.url) || []),
                  ...(post.image && !post.mediaList?.length ? [post.image] : []),
                ].filter(Boolean) as string[];
                const thumbUrl = allImages[0] || post.media?.url || '';
                const isVideo = !thumbUrl && post.mediaList?.find(m => m.type === 'VIDEO');
                return (
                  <div
                    key={post.id}
                    className="relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden group cursor-pointer"
                    onClick={() => allImages.length > 0 ? openLightbox(allImages, 0) : undefined}
                  >
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : isVideo ? (
                      <video
                        src={post.mediaList?.find(m => m.type === 'VIDEO')?.url}
                        className="h-full w-full object-cover"
                        muted
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    {allImages.length > 1 && (
                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-semibold px-1.5 py-0.5 rounded">
                        +{allImages.length - 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
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
