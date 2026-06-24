import { useEffect, useRef, useState } from 'react';
import { X, Image, Loader2, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/authService';
import { postService, type CreatePostMediaRequest } from '@/services/postService';
import { compressImage } from '@/utils/imageUtils';
import { CurrentUserAvatar } from '@/components/shared';
import { usePublicPolicies } from '@/hooks/usePublicPolicies';
import { useRefreshPoliciesOnOpen } from '@/hooks/useRefreshPoliciesOnOpen';
import { PostAllowedFormatsHint } from '@/features/profile/components/ProfileCreatePost/PostAllowedFormatsHint';
import { validatePostAgainstPolicy, checkKeywords, validatePostMediaFiles } from '@/utils/policyValidation';
import { buildPostMediaAcceptAttribute, getPostMediaKind, toApiMediaType, type PostMediaKind } from '@/utils/allowedFileTypes';
import { POSTS_FEED_KEY } from '@/features/home/hooks/usePosts';

type MediaItem = {
  id: string;
  type: PostMediaKind;
  url: string;
  previewUrl: string;
  isExisting: boolean;
  file?: File;
  fileName?: string;
  uploading?: boolean;
  uploadFailed?: boolean;
};

export interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  initialContent: string;
  initialMedia: { type: 'IMAGE' | 'VIDEO' | 'DOCUMENT'; url: string }[];
  onPostUpdated?: (data: {
    content: string;
    mediaList: { type: 'IMAGE' | 'VIDEO' | 'DOCUMENT'; url: string }[];
  }) => void;
}

export function EditPostModal({
  isOpen,
  onClose,
  postId,
  initialContent,
  initialMedia,
  onPostUpdated,
}: EditPostModalProps) {
  const [content, setContent] = useState(initialContent);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPromisesRef = useRef<Map<string, Promise<string>>>(new Map());
  const uploadControllersRef = useRef<Map<string, AbortController>>(new Map());
  const { data: publicPolicy, isLoading: policyLoading } = usePublicPolicies();
  useRefreshPoliciesOnOpen(isOpen);
  const queryClient = useQueryClient();
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    if (!isOpen) return;
    setContent(initialContent);
    setMediaItems(
      initialMedia.map((m, i) => ({
        id: `existing-${i}-${m.url}`,
        type: m.type === 'VIDEO' ? 'video' : m.type === 'DOCUMENT' ? 'document' : 'image',
        url: m.url,
        previewUrl: m.url,
        isExisting: true,
      })),
    );
  }, [isOpen, initialContent, initialMedia]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    if (policyLoading || !publicPolicy) {
      toast.error('Đang tải quy định đăng bài. Vui lòng thử lại sau.');
      e.target.value = '';
      return;
    }

    const mediaError = validatePostMediaFiles(files, publicPolicy);
    if (mediaError) {
      toast.error(mediaError);
      e.target.value = '';
      return;
    }

    const newItems: MediaItem[] = files.map((file) => {
      const kind = getPostMediaKind(file);
      return {
        id: `new-${Date.now()}-${Math.random()}`,
        type: kind,
        url: '',
        previewUrl: kind === 'document' ? '' : URL.createObjectURL(file),
        isExisting: false,
        file,
        fileName: file.name,
        uploading: true,
      };
    });

    setMediaItems((prev) => [...prev, ...newItems]);

    newItems.forEach((item) => {
      if (!item.file) return;
      const controller = new AbortController();
      uploadControllersRef.current.set(item.id, controller);

      const promise = (item.type === 'video' || item.type === 'document'
        ? postService.uploadPostImage(item.file, controller.signal)
        : compressImage(item.file).then((compressed) => postService.uploadPostImage(compressed, controller.signal))
      )
        .then((res) => {
          uploadControllersRef.current.delete(item.id);
          setMediaItems((prev) =>
            prev.map((m) =>
              m.id === item.id ? { ...m, url: res.url, uploading: false } : m,
            ),
          );
          return res.url;
        })
        .catch((err) => {
          uploadControllersRef.current.delete(item.id);
          if (err instanceof Error && err.name === 'AbortError') return '';
          const message =
            err instanceof Error && err.message
              ? err.message
              : 'Không thể tải file lên. Vui lòng thử lại.';
          toast.error(message);
          setMediaItems((prev) =>
            prev.map((m) =>
              m.id === item.id ? { ...m, uploading: false, uploadFailed: true } : m,
            ),
          );
          return '';
        });

      uploadPromisesRef.current.set(item.id, promise);
    });

    e.target.value = '';
  };

  const removeMedia = (id: string) => {
    uploadControllersRef.current.get(id)?.abort();
    uploadControllersRef.current.delete(id);
    uploadPromisesRef.current.delete(id);

    setMediaItems((prev) => {
      const removed = prev.find((m) => m.id === id);
      if (removed && !removed.isExisting) {
        if (removed.previewUrl) {
          URL.revokeObjectURL(removed.previewUrl);
        }
        if (removed.url) {
          postService.deletePostMedia(removed.url).catch(() => {});
        }
      }
      return prev.filter((m) => m.id !== id);
    });
  };

  const handleClose = () => {
    if (isSaving) return;
    uploadControllersRef.current.forEach((controller) => controller.abort());
    uploadControllersRef.current.clear();
    uploadPromisesRef.current.clear();

    mediaItems.forEach((item) => {
      if (!item.isExisting) {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
        if (item.url) {
          postService.deletePostMedia(item.url).catch(() => {});
        }
      }
    });

    onClose();
  };

  const handleSave = async () => {
    if (!currentUser?.id) {
      toast.error('Bạn cần đăng nhập để chỉnh sửa bài viết');
      return;
    }
    if (!content.trim() && mediaItems.length === 0) {
      toast.error('Bài viết phải có nội dung hoặc ảnh/video');
      return;
    }

    const failedUploads = mediaItems.filter((m) => m.uploadFailed);
    if (failedUploads.length > 0) {
      toast.error('Một số ảnh/video tải lên thất bại. Vui lòng xóa và chọn lại.');
      return;
    }

    const stillUploading = mediaItems.some((m) => m.uploading);
    if (stillUploading) {
      toast.error('Vui lòng đợi ảnh/video tải lên xong');
      return;
    }

    const policyError = validatePostAgainstPolicy(
      content.trim(),
      mediaItems.length,
      publicPolicy,
      'edit',
    );
    if (policyError) {
      toast.error(policyError);
      return;
    }

    setIsSaving(true);
    try {
      const media: CreatePostMediaRequest[] = mediaItems.map((m, i) => ({
        mediaType: toApiMediaType(m.type),
        fileUrl: m.url,
        sortOrder: i,
      }));

      const updated = await postService.updatePost(postId, {
        content: content.trim(),
        media,
      });

      const updatedMediaList = (updated.media ?? []).map((m) => ({
        type: m.mediaType,
        url: m.mediaUrl || m.fileUrl || '',
      }));

      onPostUpdated?.({
        content: updated.content || '',
        mediaList: updatedMediaList,
      });

      void queryClient.invalidateQueries({ queryKey: POSTS_FEED_KEY });
      toast.success('Đã cập nhật bài viết');
      onClose();
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : 'Không thể lưu thay đổi bài viết. Vui lòng thử lại sau.';
      toast.error(message, { duration: 6000 });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-[500px] flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {isSaving && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-lg bg-white/80 backdrop-blur-[2px] dark:bg-gray-800/80">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Đang lưu thay đổi...</p>
          </div>
        )}

        <div className="relative flex shrink-0 items-center justify-center border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Chỉnh sửa bài viết</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="absolute right-4 rounded-full p-2 transition-colors hover:bg-gray-100 dark:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-gray-700"
          >
            <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <div className="mb-4 flex items-center gap-3">
            <CurrentUserAvatar />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {currentUser?.fullName || currentUser?.username || 'Bạn'}
            </h3>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Bạn đang nghĩ gì?"
            disabled={isSaving}
            className="min-h-[120px] w-full resize-none border-none bg-transparent text-xl text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white dark:placeholder:text-gray-500"
            autoFocus
          />

          {publicPolicy && (() => {
            const max = publicPolicy.postPolicy.maxPostLength;
            const len = content.length;
            const ratio = len / max;
            return (
              <div className={`text-right text-xs ${
                ratio >= 1 ? 'font-medium text-red-500' : ratio >= 0.9 ? 'text-orange-500' : 'text-gray-400'
              }`}>
                {len} / {max}
              </div>
            );
          })()}

          {(() => {
            const err = checkKeywords(content, publicPolicy, 'edit');
            return err ? (
              <div className="mt-1 flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {err}
              </div>
            ) : null;
          })()}

          {mediaItems.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {mediaItems.map((item) => (
                <div
                  key={item.id}
                  className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-black dark:border-gray-600"
                >
                  {item.type === 'video' ? (
                    <video
                      src={item.previewUrl}
                      className="h-full w-full object-contain"
                      controls
                      playsInline
                    />
                  ) : item.type === 'document' ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gray-100 p-3 dark:bg-gray-900">
                      <FileText className="h-10 w-10 text-slate-600 dark:text-slate-300" />
                      <span className="line-clamp-2 text-center text-xs font-medium text-gray-700 dark:text-gray-200">
                        {item.fileName ?? 'Tài liệu'}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  )}
                  {item.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                  {item.uploadFailed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-900/60 p-2 text-center text-xs text-white">
                      Tải lên thất bại
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(item.id)}
                    disabled={isSaving}
                    className="absolute right-2 top-2 rounded-full bg-white dark:bg-gray-800/90 p-1 text-gray-700 dark:text-gray-300 shadow hover:bg-white dark:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={
              publicPolicy
                ? buildPostMediaAcceptAttribute(publicPolicy.postPolicy.allowedFileTypes)
                : 'image/*,video/*'
            }
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSaving || policyLoading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Image className="h-4 w-4" />
            Thêm file đính kèm
          </button>
          {publicPolicy && (
            <PostAllowedFormatsHint
              allowedFileTypes={publicPolicy.postPolicy.allowedFileTypes}
              className="mt-2"
            />
          )}
        </div>

        <div className="shrink-0 border-t border-gray-200 p-4 dark:border-gray-700">
          <button
            type="button"
            disabled={isSaving || (!content.trim() && mediaItems.length === 0)}
            onClick={() => void handleSave()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              'Lưu thay đổi'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
