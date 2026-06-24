import { useNavigate } from 'react-router-dom';
import { ImagePlus, Images } from 'lucide-react';
import { useAlbumSidebar } from '../../hooks/useAlbums';
import { AlbumSidebarCarousel } from '../AlbumSidebarCarousel/AlbumSidebarCarousel';

export function AlbumSidebarCard() {
  const navigate = useNavigate();
  const { data: albums = [], isLoading } = useAlbumSidebar();

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-600 dark:text-gray-400 font-semibold flex items-center gap-1.5">
            <Images className="w-4 h-4" />
            Kỷ niệm ảnh
          </h3>
          <button
            type="button"
            onClick={() => navigate('/albums')}
            className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Xem tất cả
          </button>
        </div>

        {isLoading ? (
          <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">Đang tải...</div>
        ) : albums.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Chưa có album nào</p>
            <button
              type="button"
              onClick={() => navigate('/albums/create')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
              Tạo album
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <AlbumSidebarCarousel albums={albums} />
            <button
              type="button"
              onClick={() => navigate('/albums/create')}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
              Tạo album mới
            </button>
          </div>
        )}
      </div>

      <div className="h-px bg-gray-300 dark:bg-gray-700" />
    </>
  );
}
