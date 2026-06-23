import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Pencil,
  Share2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/layouts';
import { useAlbumDetail, useDeleteAlbumMedia, useUploadAlbumMedia } from '../hooks/useAlbums';
import { albumService, type AlbumMedia } from '@/services/albumService';
import type { ReactionType } from '@/services/postService';
import {
  ReactionButton,
  ReactionSummaryDialog,
  reactions,
  buildInitialReactionCounts,
  type ReactionOption,
} from '@/components/reactions';
import { AlbumMediaGrid } from '../components/AlbumMediaGrid/AlbumMediaGrid';
import { AlbumCommentsSection } from '../components/AlbumCommentsSection/AlbumCommentsSection';
import { AlbumShareModal } from '../components/AlbumShareModal/AlbumShareModal';
import { EditAlbumTitleModal } from '../components/EditAlbumTitleModal/EditAlbumTitleModal';
import { EditAlbumDescriptionModal } from '../components/EditAlbumDescriptionModal/EditAlbumDescriptionModal';
import { formatAlbumDateTime } from '../utils/formatAlbumDateTime';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
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
  const [editTitleOpen, setEditTitleOpen] = useState(false);
  const [editDescriptionOpen, setEditDescriptionOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<ReactionOption | null>(null);
  const [reactionCount, setReactionCount] = useState(0);
  const [isReacting, setIsReacting] = useState(false);
  const [reactionSummaryOpen, setReactionSummaryOpen] = useState(false);

  const reactionSummaryCounts = useMemo(
    () => buildInitialReactionCounts(reactionCount, selectedReaction?.type ?? null),
    [reactionCount, selectedReaction],
  );

  const media = album?.media ?? [];

  useEffect(() => {
    if (!album) return;
    setReactionCount(album.reactionCount);
    setSelectedReaction(
      album.viewerReaction
        ? reactions.find((item) => item.type === album.viewerReaction) ?? null
        : null,
    );
  }, [album]);

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

  const handleReactionChange = async (reaction: ReactionOption | null) => {
    if (!albumId) return;
    try {
      setIsReacting(true);
      if (!reaction) {
        if (!selectedReaction) return;
        await albumService.removeReaction(albumId);
        setReactionCount((prev) => Math.max(0, prev - 1));
        setSelectedReaction(null);
      } else {
        await albumService.addReaction(albumId, reaction.type as ReactionType);
        if (!selectedReaction) {
          setReactionCount((prev) => prev + 1);
        }
        setSelectedReaction(reaction);
      }
    } catch {
      toast.error('Không thể cập nhật cảm xúc.');
      void refetch();
    } finally {
      setIsReacting(false);
    }
  };

  const handleDeleteMedia = (mediaId: string) => {
    setMediaToDelete(mediaId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteMedia = async () => {
    if (!mediaToDelete) return;
    try {
      await deleteMedia.mutateAsync(mediaToDelete);
      toast.success('Đã xóa.');
      if (lightboxIndex !== null) setLightboxIndex(null);
      setDeleteDialogOpen(false);
      setMediaToDelete(null);
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
            <div className="flex items-start gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex-1">{album.title}</h1>
              {album.canEdit && (
                <button
                  type="button"
                  onClick={() => setEditTitleOpen(true)}
                  className="p-2 rounded-full text-gray-500 hover:bg-muted hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 shrink-0"
                  aria-label="Đổi tên album"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
            {(album.description || album.canEdit) && (
              <div className="flex items-start gap-2 mt-2">
                {album.description ? (
                  <p className="text-gray-600 dark:text-gray-400 flex-1">{album.description}</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditDescriptionOpen(true)}
                    className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 italic"
                  >
                    Thêm mô tả...
                  </button>
                )}
                {album.canEdit && album.description && (
                  <button
                    type="button"
                    onClick={() => setEditDescriptionOpen(true)}
                    className="p-1.5 rounded-full text-gray-500 hover:bg-muted hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 shrink-0"
                    aria-label="Sửa mô tả album"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            {album.groupName && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Nhóm: {album.groupName}</p>
            )}
            {album.createdAt && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Tạo ngày {formatAlbumDateTime(album.createdAt)}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <span className="text-sm text-gray-500">{album.mediaCount} ảnh/video</span>
              <div className="inline-flex items-center rounded-full bg-muted">
                <ReactionButton
                  initialReaction={selectedReaction}
                  onReactionChange={(reaction) => void handleReactionChange(reaction)}
                  compact
                  disabled={isReacting}
                  buttonClassName="cursor-pointer rounded-full bg-transparent px-3 py-1.5 hover:bg-muted/80 disabled:cursor-not-allowed"
                />
                {reactionCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setReactionSummaryOpen(true)}
                    className="text-sm font-medium text-gray-600 dark:text-gray-300 pl-1 pr-3 tabular-nums hover:underline cursor-pointer"
                  >
                    {reactionCount}
                  </button>
                )}
              </div>
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
        coverUrl={album.coverUrl}
        mediaCount={album.mediaCount}
        ownerName={album.ownerName}
      />

      <ReactionSummaryDialog
        open={reactionSummaryOpen}
        onOpenChange={setReactionSummaryOpen}
        postId={album.id}
        reactionCounts={reactionSummaryCounts}
        fetchDetails={() => albumService.getReactionDetails(album.id)}
      />

      <EditAlbumTitleModal
        albumId={album.id}
        isOpen={editTitleOpen}
        initialTitle={album.title}
        onClose={() => setEditTitleOpen(false)}
      />

      <EditAlbumDescriptionModal
        albumId={album.id}
        isOpen={editDescriptionOpen}
        initialDescription={album.description}
        onClose={() => setEditDescriptionOpen(false)}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setMediaToDelete(null);
        }}
      >
        <AlertDialogContent className="border border-gray-200 bg-white sm:max-w-md dark:border-gray-600 dark:bg-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white">Xóa ảnh/video</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
              Xóa ảnh/video này khỏi album?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer border-gray-300 dark:border-gray-600">Không</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 dark:bg-red-600 dark:hover:bg-red-700"
              disabled={deleteMedia.isPending}
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteMedia();
              }}
            >
              {deleteMedia.isPending ? 'Đang xóa...' : 'Có'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
