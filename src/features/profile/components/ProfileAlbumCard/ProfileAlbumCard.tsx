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
      className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {album.coverUrl ? (
          <ImageWithFallback
            src={album.coverUrl}
            alt={album.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
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
        <p className="truncate font-semibold text-foreground">{album.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {album.mediaCount} ảnh/video
        </p>
      </div>
    </button>
  );
}
