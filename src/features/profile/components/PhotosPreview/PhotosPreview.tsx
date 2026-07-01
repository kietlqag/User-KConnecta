import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';
import { isVideoUrl, getVideoThumbnail } from '@/utils/mediaUtils';

interface Photo {
  id: string;
  url: string;
  mediaType: 'IMAGE' | 'VIDEO';
  thumbnailUrl?: string | null;
}

interface PhotosPreviewProps {
  userId: string;
  photos: Photo[];
}

export function PhotosPreview({ userId, photos }: PhotosPreviewProps) {
  const displayPhotos = photos.slice(0, 9);
  const remainingCount = Math.max(0, photos.length - 9);

  return (
    <div className="rounded-lg bg-card p-4 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Phương tiện</h2>
        <Link
          to={`/profile/${userId}/photos`}
          className="cursor-pointer font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm"
        >
          Xem tất cả
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {displayPhotos.map((photo, index) => {
          const isVideo = photo.mediaType === 'VIDEO';
          const thumbSrc = isVideo
            ? (photo.thumbnailUrl && !isVideoUrl(photo.thumbnailUrl) ? photo.thumbnailUrl : getVideoThumbnail(photo.url))
            : photo.url;

          return (
            <Link
              key={photo.id}
              to={`/profile/${userId}/photos`}
              className="group relative aspect-square overflow-hidden rounded-lg"
            >
              <ImageWithFallback
                src={thumbSrc}
                alt={`Photo ${index + 1}`}
                className="h-full w-full object-cover transition-[filter] duration-200 group-hover:brightness-95"
              />
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Play className="w-6 h-6 text-white fill-white" />
                </div>
              )}
              {index === 8 && remainingCount > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <span className="text-2xl font-bold text-white">+{remainingCount}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
