import { useNavigate } from 'react-router-dom';
import { Album as AlbumIcon, ImagePlus } from 'lucide-react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { useGroupAlbums } from '@/features/albums/hooks/useAlbums';

interface GroupAlbumsTabProps {
  groupId: string;
  canCreate?: boolean;
}

export function GroupAlbumsTab({ groupId, canCreate = false }: GroupAlbumsTabProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useGroupAlbums(groupId);
  const albums = data?.content ?? [];

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <AlbumIcon className="w-5 h-5 text-emerald-600" />
            Album nhóm
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Lưu giữ kỷ niệm ảnh và video của cả nhóm
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => navigate(`/albums/create?groupId=${groupId}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
          >
            <ImagePlus className="w-4 h-4" />
            Tạo album
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Đang tải album...</div>
      ) : albums.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <AlbumIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">Nhóm chưa có album nào</p>
          {canCreate && (
            <button
              type="button"
              onClick={() => navigate(`/albums/create?groupId=${groupId}`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium"
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
              className="group text-left rounded-xl overflow-hidden border border-border hover:shadow-lg transition-shadow"
            >
              <div className="aspect-square bg-background relative overflow-hidden">
                {album.coverUrl ? (
                  <ImageWithFallback
                    src={album.coverUrl}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <AlbumIcon className="w-10 h-10 opacity-40" />
                  </div>
                )}
              </div>
              <div className="p-3 bg-card">
                <p className="font-semibold text-foreground truncate">{album.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {album.mediaCount} ảnh/video · {album.ownerName}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
