import { useCallback, useEffect, useState } from 'react';
import { GripVertical, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import type { AlbumMedia } from '@/services/albumService';
import { useReorderAlbumMedia } from '../../hooks/useAlbums';
import { formatAlbumDateTime } from '../../utils/formatAlbumDateTime';
import { isVideoUrl, getVideoThumbnail } from '@/utils/mediaUtils';

interface AlbumMediaGridProps {
  albumId: string;
  media: AlbumMedia[];
  canEdit: boolean;
  onOpenLightbox: (index: number) => void;
  onDeleteMedia: (mediaId: string) => void;
}

export function AlbumMediaGrid({
  albumId,
  media,
  canEdit,
  onOpenLightbox,
  onDeleteMedia,
}: AlbumMediaGridProps) {
  const reorder = useReorderAlbumMedia(albumId);
  const [items, setItems] = useState(media);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    setItems(media);
  }, [media]);

  const persistOrder = useCallback(
    async (ordered: AlbumMedia[]) => {
      try {
        await reorder.mutateAsync(ordered.map((m) => m.id));
      } catch {
        toast.error('Không thể sắp xếp ảnh');
        setItems(media);
      }
    },
    [media, reorder],
  );

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setItems(next);
    setDragIndex(null);
    void persistOrder(next);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {items.map((item, index) => {
        const isVideo = item.mediaType === 'VIDEO';
        const thumbSrc = isVideo
          ? (item.thumbnailUrl && !isVideoUrl(item.thumbnailUrl) ? item.thumbnailUrl : getVideoThumbnail(item.url))
          : item.url;

        return (
          <div
            key={item.id}
            draggable={canEdit}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            onDragEnd={() => setDragIndex(null)}
            className={`relative group aspect-square rounded-lg overflow-hidden bg-muted ${ dragIndex === index ? 'ring-2 ring-emerald-500 opacity-70' : '' } ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            <button type="button" onClick={() => onOpenLightbox(index)} className="w-full h-full">
              {isVideo ? (
                <div className="relative w-full h-full">
                  <ImageWithFallback
                    src={thumbSrc}
                    alt={item.caption ?? 'Video'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-10 h-10 text-white fill-white" />
                  </div>
                </div>
              ) : (
                <ImageWithFallback
                  src={thumbSrc}
                  alt={item.caption ?? 'Ảnh'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              )}
            </button>
          {item.createdAt && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent px-2.5 pt-6 pb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <p className="text-[11px] leading-tight text-white font-medium">
                Thêm ngày {formatAlbumDateTime(item.createdAt)}
              </p>
            </div>
          )}
          {canEdit && (
            <>
              <div className="absolute top-2 left-2 p-1 rounded bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <GripVertical className="w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMedia(item.id);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                aria-label="Xóa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      );
    })}
    </div>
  );
}
