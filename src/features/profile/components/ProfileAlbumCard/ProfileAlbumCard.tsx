import { Images } from 'lucide-react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { getAlbumPrivacyMeta } from '@/features/albums/utils/albumPrivacy';
import type { Album } from '@/services/albumService';

interface ProfileAlbumCardProps {
  album: Album;
  showPrivacy?: boolean;
  onOpen: () => void;
}

export function ProfileAlbumCard({ album, showPrivacy = false, onOpen }: ProfileAlbumCardProps) {
  const privacyMeta = getAlbumPrivacyMeta(album.privacy);
  const PrivacyIcon = privacyMeta.icon;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group overflow-hidden rounded-xl border border-gray-200 bg-white text-left transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
        {album.coverUrl ? (
          <ImageWithFallback
            src={album.coverUrl}
            alt={album.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <Images className="h-10 w-10 opacity-40" />
          </div>
        )}
        {showPrivacy && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
            <PrivacyIcon className="h-3 w-3" />
            {privacyMeta.label}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{album.title}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {album.mediaCount} ảnh/video
        </p>
      </div>
    </button>
  );
}
