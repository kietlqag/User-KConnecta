import { GripVertical, Images, Trash2 } from 'lucide-react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import type { Album } from '@/services/albumService';

interface AlbumListCardProps {
  album: Album;
  draggable?: boolean;
  isDragging?: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

export function AlbumListCard({
  album,
  draggable = false,
  isDragging = false,
  onOpen,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: AlbumListCardProps) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group relative overflow-hidden rounded-xl border border-gray-200 bg-white text-left transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-900 ${
        isDragging ? 'opacity-70 ring-2 ring-blue-500' : ''
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left">
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
        </div>
        <div className="p-3">
          <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{album.title}</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{album.mediaCount} ảnh/video</p>
        </div>
      </button>

      {album.canEdit && (
        <>
          <div
            className="pointer-events-none absolute left-2 top-2 rounded bg-black/45 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
            aria-label="Xóa album"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
