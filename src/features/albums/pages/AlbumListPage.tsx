import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, Images } from 'lucide-react';
import { MainLayout } from '@/layouts';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { useMyAlbums } from '../hooks/useAlbums';
import { CreateAlbumModal } from '../components/CreateAlbumModal/CreateAlbumModal';

export function AlbumListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useMyAlbums();
  const [createOpen, setCreateOpen] = useState(false);
  const albums = data?.content ?? [];

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Images className="w-7 h-7 text-blue-600" />
              Album của bạn
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Quản lý ảnh và video kỷ niệm của bạn
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <ImagePlus className="w-4 h-4" />
            Tạo album
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Đang tải album...</div>
        ) : albums.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center bg-white dark:bg-gray-900">
            <Images className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">Bạn chưa có album nào</p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              <ImagePlus className="w-4 h-4" />
              Tạo album đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {albums.map((album) => (
              <button
                key={album.id}
                type="button"
                onClick={() => navigate(`/albums/${album.id}`)}
                className="group text-left rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                  {album.coverUrl ? (
                    <ImageWithFallback
                      src={album.coverUrl}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Images className="w-10 h-10 opacity-40" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{album.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {album.mediaCount} ảnh/video
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <CreateAlbumModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </MainLayout>
  );
}
