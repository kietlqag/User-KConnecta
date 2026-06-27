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
      <div className="mx-auto flex h-[calc(100vh-56px)] w-full max-w-[1600px] flex-col px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex shrink-0 items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Images className="h-7 w-7 text-emerald-600" />
              Album của bạn
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
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

        <div className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto pb-6">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Đang tải album...</div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <Images className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-muted-foreground">Bạn chưa có album nào</p>
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
          )}
        </div>
      </div>

      <AlertDialog open={Boolean(albumToDelete)} onOpenChange={(open) => !open && setAlbumToDelete(null)}>
        <AlertDialogContent className="border border-border bg-card sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Xóa album</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Xóa album &quot;{albumToDelete?.title}&quot;? Toàn bộ ảnh và video trong album sẽ bị xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer border-border">Hủy</AlertDialogCancel>
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
