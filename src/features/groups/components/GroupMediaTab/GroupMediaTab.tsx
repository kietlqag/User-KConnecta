import * as React from 'react';
import { X, ChevronLeft, ChevronRight, Images, Play } from 'lucide-react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { authService } from '@/services/authService';
import { postService, type PostResponse } from '@/services/postService';

interface MediaItem {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  thumbnailUrl?: string;
  postId: string;
  date: string;
}

function isVideoUrl(url: string): boolean {
  return url.includes('/video/') || /\.(mp4|mov|webm|ogg)(\?.*)?$/i.test(url);
}

function extractMedia(posts: PostResponse[]): MediaItem[] {
  return posts
    .filter(p => !p.status || p.status === 'PUBLISHED')
    .flatMap(post => {
      const date = new Date(post.publishedAt || post.createdAt).toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const items = (post.media ?? [])
        .map(m => {
          const url = m.mediaUrl || m.fileUrl;
          return url
            ? {
                id: `${post.id}-${m.id ?? m.sortOrder}`,
                type: m.mediaType,
                url,
                thumbnailUrl: m.thumbnailUrl,
                postId: post.id,
                date,
              }
            : null;
        })
        .filter(Boolean) as MediaItem[];

      // Legacy posts store their single image/video in `imageUrl` with no media[] entries.
      if (items.length === 0 && post.imageUrl) {
        items.push({
          id: `${post.id}-legacy`,
          type: isVideoUrl(post.imageUrl) ? 'VIDEO' : 'IMAGE',
          url: post.imageUrl,
          postId: post.id,
          date,
        });
      }

      return items;
    });
}

function MediaSkeleton() {
  return <div className="aspect-square rounded-lg bg-muted animate-pulse" />;
}

interface GroupMediaTabProps {
  groupId: string;
}

export function GroupMediaTab({ groupId }: GroupMediaTabProps) {
  const currentUser = React.useMemo(() => authService.getCurrentUser(), []);
  const [items, setItems] = React.useState<MediaItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [lbIndex, setLbIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    postService.getGroupPosts(groupId, currentUser?.id)
      .then(posts => { if (!cancelled) setItems(extractMedia(posts)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [groupId, currentUser?.id]);

  const closeLightbox = () => setLbIndex(null);
  const prev = () => setLbIndex(i => (i === null ? null : i === 0 ? items.length - 1 : i - 1));
  const next = () => setLbIndex(i => (i === null ? null : i === items.length - 1 ? 0 : i + 1));

  React.useEffect(() => {
    if (lbIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lbIndex, items.length]);

  React.useEffect(() => {
    document.body.style.overflow = lbIndex !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [lbIndex]);

  return (
    <>
      <div className="bg-card rounded-2xl shadow-sm dark:shadow-none border border-border p-5">
        <div className="flex items-center gap-3 mb-5">
          <Images className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-foreground">
            Ảnh và video
            {!loading && (
              <span className="ml-2 text-base font-normal text-muted-foreground">· {items.length}</span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => <MediaSkeleton key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-4 h-20 w-20">
              <div className="absolute inset-0 rotate-6 rounded-xl bg-muted" />
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background border border-border">
                <Images className="h-10 w-10 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Chưa có ảnh hoặc video</h3>
            <p className="text-sm text-muted-foreground">Ảnh và video đăng trong nhóm sẽ hiển thị tại đây.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-background"
                onClick={() => setLbIndex(index)}
              >
                {item.type === 'VIDEO' ? (
                  item.thumbnailUrl ? (
                    <ImageWithFallback
                      src={item.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <video
                      src={item.url}
                      muted
                      preload="metadata"
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  )
                ) : (
                  <ImageWithFallback
                    src={item.url}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                )}
                {item.type === 'VIDEO' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-end">
                  <p className="w-full px-2 py-1.5 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent">
                    {item.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lbIndex !== null && items.length > 0 && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90" onClick={closeLightbox}>
          <button className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white" onClick={closeLightbox}>
            <X className="w-7 h-7" />
          </button>
          <span className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm font-medium px-3 py-1 rounded-full">
            {lbIndex + 1} / {items.length}
          </span>
          {items.length > 1 && (
            <button className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white" onClick={e => { e.stopPropagation(); prev(); }}>
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {items[lbIndex].type === 'VIDEO' ? (
            <video
              src={items[lbIndex].url}
              controls
              autoPlay
              className="max-h-[90vh] max-w-[90vw] object-contain shadow-2xl rounded-sm"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <img
              src={items[lbIndex].url}
              alt=""
              className="max-h-[90vh] max-w-[90vw] object-contain shadow-2xl rounded-sm"
              onClick={e => e.stopPropagation()}
            />
          )}
          {items.length > 1 && (
            <button className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white" onClick={e => { e.stopPropagation(); next(); }}>
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
