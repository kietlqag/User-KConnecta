import { Link } from 'react-router@7.1.3';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';

interface Photo {
  id: string;
  url: string;
}

interface PhotosPreviewProps {
  username: string;
  photos: Photo[];
}

export function PhotosPreview({ username, photos }: PhotosPreviewProps) {
  const displayPhotos = photos.slice(0, 9);
  const remainingCount = Math.max(0, photos.length - 9);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Ảnh</h2>
        <Link
          to={`/profile/${username}/photos`}
          className="text-emerald-600 hover:underline font-medium"
        >
          Xem tất cả ảnh
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {displayPhotos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
          >
            <ImageWithFallback
              src={photo.url}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            {index === 8 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">+{remainingCount}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}