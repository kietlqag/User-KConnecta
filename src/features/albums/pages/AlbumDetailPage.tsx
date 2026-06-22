import { useCallback, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  ImagePlus,
  Share2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/layouts';
import { useAlbumDetail, useDeleteAlbumMedia, useUploadAlbumMedia } from '../hooks/useAlbums';
import { albumService, type AlbumMedia } from '@/services/albumService';
import { AlbumMediaGrid } from '../components/AlbumMediaGrid/AlbumMediaGrid';
import { AlbumCommentsSection } from '../components/AlbumCommentsSection/AlbumCommentsSection';
import { AlbumShareModal } from '../components/AlbumShareModal/AlbumShareModal';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';

export function AlbumDetailPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: album, isLoading, error, refetch } = useAlbumDetail(albumId);
  const uploadMedia = useUploadAlbumMedia(albumId!);
  const deleteMedia = useDeleteAlbumMedia(albumId!);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const media = album?.media ?? [];

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || !album?.canEdit) return;
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          await uploadMedia.mutateAsync({ file });
        }
        toast.success('Đã thêm ảnh/video vào album.');
        void refetch();
      } catch {
        toast.error('Không thể tải lên. Vui lòng thử lại.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [album?.canEdit, uploadMedia, refetch],
  );

  const handleLike = async () => {
    if (!albumId || !album) return;
    try {
      if (album.viewerReaction) {
        await albumService.removeReaction(albumId);
      } else {
        await albumService.addReaction(albumId, 'LIKE');
      }
      void refetch();
    } catch {
      toast.error('Không thể cập nhật cảm xúc.');
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!window.confirm('Xóa ảnh/video này khỏi album?')) return;
    try {
      await deleteMedia.mutateAsync(mediaId);
      toast.success('Đã xóa.');
      if (lightboxIndex !== null) setLightboxIndex(null);
    } catch {
      toast.error('Không thể xóa.');
    }
  };

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevMedia = () => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  const nextMedia = () =>
    setLightboxIndex((i) => (i !== null && i < media.length - 1 ? i + 1 : i));

  if (isLoading) {
    return (
      <MainLayout>
        <div className="text-center py-20 text-gray-500">Đang tải album...</div>
      </MainLayout>
    );
  }

  if (error || !album) {
    return (
      <MainLayout>
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">Không tìm thấy album hoặc bạn không có quyền xem.</p>
          <button type="button" onClick={() => navigate('/albums')} className="text-blue-600 hover:underline text-sm">
            Quay lại danh sách
          </button>
        </div>
      </MainLayout>
    );
  }

  const currentMedia: AlbumMedia | undefined = lightboxIndex !== null ? media[lightboxIndex] : undefined;

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button
          type="button"
          onClick={() => (album.groupId ? navigate(`/groups/${album.groupId}?tab=albums`) : navigate('/albums'))}
          className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {album.groupId ? 'Album nhóm' : 'Album của bạn'}
        </button>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm mb-6">
          {album.coverUrl && (
            <div className="h-48 sm:h-64 bg-gray-100 dark:bg-gray-800">
              <ImageWithFallback src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-5">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{album.title}</h1>
            {album.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">{album.description}</p>
            )}
            {album.groupName && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Nhóm: {album.groupName}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <span className="text-sm text-gray-500">{album.mediaCount} ảnh/video</span>
              <button
                type="button"
                onClick={() => void handleLike()}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  album.viewerReaction
                    ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-muted text-gray-600 dark:text-gray-300 hover:bg-muted/80'
                }`}
              >
                <Heart className={`w-4 h-4 ${album.viewerReaction ? 'fill-current' : ''}`} />
                {album.reactionCount > 0 ? album.reactionCount : 'Thích'}
              </button>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-muted/80"
              >
                <Share2 className="w-4 h-4" />
                Chia sẻ
              </button>
              {album.canEdit && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => void handleFiles(e.target.files)}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                  >
                    <ImagePlus className="w-4 h-4" />
                    {uploading ? 'Đang tải...' : 'Thêm ảnh/video'}
                  </button>
                </>
              )}
            </div>
            {album.canEdit && media.length > 1 && (
              <p className="text-xs text-gray-500 mt-3">Kéo thả ảnh để sắp xếp thứ tự</p>
            )}
          </div>
        </div>

        {media.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
            <p className="text-gray-500 mb-4">Album chưa có ảnh hoặc video</p>
            {album.canEdit && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
              >
                <ImagePlus className="w-4 h-4" />
                Thêm ngay
              </button>
            )}
          </div>
        ) : (
          <AlbumMediaGrid
            albumId={album.id}
            media={media}
            canEdit={album.canEdit}
            onOpenLightbox={openLightbox}
            onDeleteMedia={(id) => void handleDeleteMedia(id)}
          />
        )}

        <AlbumCommentsSection albumId={album.id} />
      </div>

      <AlbumShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        albumId={album.id}
        albumTitle={album.title}
      />

      {currentMedia && lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm">{lightboxIndex + 1} / {media.length}</span>
            <button type="button" onClick={closeLightbox} className="p-2 rounded-full hover:bg-white/10">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center relative px-4">
            {lightboxIndex > 0 && (
              <button type="button" onClick={prevMedia} className="absolute left-2 sm:left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}
            {currentMedia.mediaType === 'VIDEO' ? (
              <video src={currentMedia.url} controls autoPlay className="max-h-[75vh] max-w-full rounded-lg" />
            ) : (
              <img src={currentMedia.url} alt={currentMedia.caption ?? ''} className="max-h-[75vh] max-w-full object-contain rounded-lg" />
            )}
            {lightboxIndex < media.length - 1 && (
              <button type="button" onClick={nextMedia} className="absolute right-2 sm:right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
                <ChevronRight className="w-8 h-8" />
              </button>
            )}
          </div>
          {currentMedia.caption && (
            <p className="text-center text-white/80 text-sm pb-6 px-4">{currentMedia.caption}</p>
          )}
        </div>
      )}
    </MainLayout>
  );
}
