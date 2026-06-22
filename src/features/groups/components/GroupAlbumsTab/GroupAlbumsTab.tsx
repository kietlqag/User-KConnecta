import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Album as AlbumIcon, ImagePlus } from 'lucide-react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { useGroupAlbums } from '@/features/albums/hooks/useAlbums';
import { CreateAlbumModal } from '@/features/albums/components/CreateAlbumModal/CreateAlbumModal';

interface GroupAlbumsTabProps {
  groupId: string;
  canCreate?: boolean;
}

export function GroupAlbumsTab({ groupId, canCreate = false }: GroupAlbumsTabProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useGroupAlbums(groupId);
  const [createOpen, setCreateOpen] = useState(false);
  const albums = data?.content ?? [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <AlbumIcon className="w-5 h-5 text-blue-600" />
            Album nhóm
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Lưu giữ kỷ niệm ảnh và video của cả nhóm
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            <ImagePlus className="w-4 h-4" />
            Tạo album
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Đang tải album...</div>
      ) : albums.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
          <AlbumIcon className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">Nhóm chưa có album nào</p>
          {canCreate && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
            >
              <ImagePlus className="w-4 h-4" />
              Tạo album đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {albums.map((album) => (
            <button
              key={album.id}
              type="button"
              onClick={() => navigate(`/albums/${album.id}`)}
              className="group text-left rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="aspect-square bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
                {album.coverUrl ? (
                  <ImageWithFallback
                    src={album.coverUrl}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <AlbumIcon className="w-10 h-10 opacity-40" />
                  </div>
                )}
              </div>
              <div className="p-3 bg-white dark:bg-gray-800">
                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{album.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {album.mediaCount} ảnh/video · {album.ownerName}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <CreateAlbumModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        groupId={groupId}
      />
    </div>
  );
}
