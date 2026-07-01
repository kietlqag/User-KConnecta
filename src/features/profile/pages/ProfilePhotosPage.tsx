import * as React from 'react';
import { X, ChevronLeft, ChevronRight, Images, Play } from 'lucide-react';
import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { authService } from '@/services/authService';
import { isVideoUrl, getVideoThumbnail } from '@/utils/mediaUtils';
import { useProfileLayoutContext } from './ProfileLayout';
import {
  extractPhotosFromPosts,
  fetchAllUserPosts,
  isAbortError,
  type ProfilePhoto,
} from '../utils/profilePhotoUtils';
import { logProfileTabError, useProfileTabDebug } from '../utils/profileTabLogger';

function PhotoSkeleton() {
  return <div className="aspect-square rounded-lg bg-muted animate-pulse" />;
}

export function ProfilePhotosPage() {
  const { resolvedId, loading: profileLoading } = useProfileLayoutContext();
  useProfileTabDebug('photos', resolvedId);
  const currentUser = React.useMemo(() => authService.getCurrentUser(), []);

  const [photos, setPhotos] = React.useState<ProfilePhoto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [lbIndex, setLbIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!resolvedId) return;
    const controller = new AbortController();
    setLoading(true);

    fetchAllUserPosts(resolvedId, currentUser?.id, controller.signal)
      .then((posts) => {
        setPhotos(extractPhotosFromPosts(posts));
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          logProfileTabError('photos', 'load-posts', error, { resolvedId });
          setPhotos([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [resolvedId, currentUser?.id]);

  const openLightbox  = (i: number) => setLbIndex(i);
  const closeLightbox = () => setLbIndex(null);
  const prev = () => setLbIndex(i => (i === null ? null : i === 0 ? photos.length - 1 : i - 1));
  const next = () => setLbIndex(i => (i === null ? null : i === photos.length - 1 ? 0 : i + 1));

  React.useEffect(() => {
    if (lbIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lbIndex, photos.length]);

  React.useEffect(() => {
    document.body.style.overflow = lbIndex !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [lbIndex]);

  const isLoadingContent = profileLoading || loading;

  return (
    <>
      <div className="max-w-[1100px] mx-auto px-4 py-6">
        <div className="bg-card rounded-2xl shadow-sm dark:shadow-none border border-border p-5">
          <div className="flex items-center gap-3 mb-5">
            <Images className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-foreground">
              Phương tiện
              {!isLoadingContent && (
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  · {photos.length}
                </span>
              )}
            </h2>
          </div>

          {isLoadingContent ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {Array.from({ length: 15 }).map((_, i) => <PhotoSkeleton key={i} />)}
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-4 h-20 w-20">
                <div className="absolute inset-0 rotate-6 rounded-xl bg-muted" />
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-muted border border-border">
                  <Images className="h-10 w-10 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Chưa có phương tiện nào</h3>
              <p className="text-sm text-muted-foreground">Các ảnh và video từ bài viết sẽ xuất hiện ở đây.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {photos.map((photo, index) => {
                  const isVideo = photo.mediaType === 'VIDEO';
                  const thumbSrc = isVideo
                    ? (photo.thumbnailUrl && !isVideoUrl(photo.thumbnailUrl) ? photo.thumbnailUrl : getVideoThumbnail(photo.url))
                    : photo.url;

                  return (
                    <div
                      key={photo.id}
                      className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-muted"
                      onClick={() => openLightbox(index)}
                    >
                      <ImageWithFallback
                        src={thumbSrc}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-end">
                        <p className="w-full px-2 py-1.5 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent">
                          {photo.date}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {lbIndex !== null && photos.length > 0 && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          <button className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white" onClick={closeLightbox}>
            <X className="w-7 h-7" />
          </button>
          <span className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm font-medium px-3 py-1 rounded-full">
            {lbIndex + 1} / {photos.length}
          </span>
          {photos.length > 1 && (
            <button className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white" onClick={e => { e.stopPropagation(); prev(); }}>
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {photos[lbIndex].mediaType === 'VIDEO' ? (
            <video src={photos[lbIndex].url} controls autoPlay className="max-h-[90vh] max-w-[90vw] rounded-sm shadow-2xl" onClick={e => e.stopPropagation()} />
          ) : (
            <img src={photos[lbIndex].url} alt="" className="max-h-[90vh] max-w-[90vw] object-contain shadow-2xl rounded-sm" onClick={e => e.stopPropagation()} />
          )}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
            {photos[lbIndex].date}
          </p>
          {photos.length > 1 && (
            <button className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white" onClick={e => { e.stopPropagation(); next(); }}>
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
