import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, Images } from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/layouts';
import { useDeleteAlbum, useMyAlbums, useReorderMyAlbums } from '../hooks/useAlbums';
import { AlbumListCard } from '../components/AlbumListCard/AlbumListCard';
import type { Album } from '@/services/albumService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function AlbumListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useMyAlbums();
  const deleteAlbum = useDeleteAlbum();
  const reorderAlbums = useReorderMyAlbums();
  const [items, setItems] = useState<Album[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [albumToDelete, setAlbumToDelete] = useState<Album | null>(null);

  const albums = data?.content ?? [];

  useEffect(() => {
    setItems((prev) => {
      if (prev.length === 0) return albums;
      const prevIds = prev.map((album) => album.id).join(',');
      const nextIds = albums.map((album) => album.id).join(',');
      if (prevIds !== nextIds) return albums;
      return prev;
    });
  }, [albums]);

  const persistOrder = useCallback(
    async (ordered: Album[]) => {
      try {
        await reorderAlbums.mutateAsync(ordered.map((album) => album.id));
      } catch {
        toast.error('Không thể sắp xếp album');
        setItems(albums);
      }
    },
    [albums, reorderAlbums],
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

  const confirmDelete = async () => {
    if (!albumToDelete) return;
    try {
      await deleteAlbum.mutateAsync(albumToDelete.id);
      toast.success('Đã xóa album');
      setAlbumToDelete(null);
    } catch {
      toast.error('Không thể xóa album');
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
              <Images className="h-7 w-7 text-emerald-600" />
              Album của bạn
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Quản lý ảnh và video kỷ niệm của bạn
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/albums/create')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <ImagePlus className="h-4 w-4" />
            Tạo album
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Đang tải album...</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-900">
            <Images className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="mb-4 text-gray-600 dark:text-gray-400">Bạn chưa có album nào</p>
            <button
              type="button"
              onClick={() => navigate('/albums/create')}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <ImagePlus className="h-4 w-4" />
              Tạo album đầu tiên
            </button>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Kéo thả album để sắp xếp thứ tự
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((album, index) => (
                <AlbumListCard
                  key={album.id}
                  album={album}
                  draggable={album.canEdit}
                  isDragging={dragIndex === index}
                  onOpen={() => navigate(`/albums/${album.id}`)}
                  onDelete={() => setAlbumToDelete(album)}
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={() => setDragIndex(null)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <AlertDialog open={Boolean(albumToDelete)} onOpenChange={(open) => !open && setAlbumToDelete(null)}>
        <AlertDialogContent className="border border-gray-200 bg-white sm:max-w-md dark:border-gray-600 dark:bg-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white">Xóa album</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
              Xóa album &quot;{albumToDelete?.title}&quot;? Toàn bộ ảnh và video trong album sẽ bị xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer border-gray-300 dark:border-gray-600">Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 dark:bg-red-600 dark:hover:bg-red-700"
              disabled={deleteAlbum.isPending}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleteAlbum.isPending ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
