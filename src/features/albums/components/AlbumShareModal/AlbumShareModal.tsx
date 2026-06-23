import { ShareModal } from '@/components/share/ShareModal';
import type { PostResponse } from '@/services/postService';

interface AlbumShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  albumId: string;
  albumTitle: string;
  coverUrl?: string | null;
  mediaCount?: number;
  ownerName?: string;
  onShareComplete?: (response: PostResponse) => void;
}

export function AlbumShareModal({
  isOpen,
  onClose,
  albumId,
  albumTitle,
  coverUrl,
  mediaCount = 0,
  ownerName,
  onShareComplete,
}: AlbumShareModalProps) {
  return (
    <ShareModal
      isOpen={isOpen}
      onClose={onClose}
      target={{
        type: 'album',
        albumId,
        title: albumTitle,
        coverUrl,
        mediaCount,
        ownerName,
        onShareComplete,
      }}
    />
  );
}
