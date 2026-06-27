import { Link } from 'react-router-dom';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';

interface Photo {
  id: string;
  url: string;
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
        <h2 className="text-xl font-bold text-foreground">Ảnh</h2>
        <Link
          to={`/profile/${userId}/photos`}
          className="cursor-pointer font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          Xem tất cả ảnh
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {displayPhotos.map((photo, index) => (
          <Link
            key={photo.id}
            to={`/profile/${userId}/photos`}
            className="group relative aspect-square overflow-hidden rounded-lg"
          >
            <ImageWithFallback
              src={photo.url}
              alt={`Photo ${index + 1}`}
              className="h-full w-full object-cover transition-[filter] duration-200 group-hover:brightness-95"
            />
            {index === 8 && remainingCount > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="text-2xl font-bold text-white">+{remainingCount}</span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
