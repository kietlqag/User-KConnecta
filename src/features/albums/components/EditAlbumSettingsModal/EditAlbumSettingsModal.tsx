import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Album, AlbumMedia, AlbumPrivacy } from '@/services/albumService';
import { useSetAlbumCover, useUpdateAlbum } from '../../hooks/useAlbums';
import { ALBUM_PRIVACY_OPTIONS } from '../../utils/albumPrivacy';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';

interface EditAlbumSettingsModalProps {
  album: Album;
  media: AlbumMedia[];
  isOpen: boolean;
  onClose: () => void;
}

export function EditAlbumSettingsModal({ album, media, isOpen, onClose }: EditAlbumSettingsModalProps) {
  const updateAlbum = useUpdateAlbum(album.id);
  const setCover = useSetAlbumCover(album.id);

  const [title, setTitle] = useState(album.title);
  const [description, setDescription] = useState(album.description ?? '');
  const [privacy, setPrivacy] = useState<AlbumPrivacy>(album.privacy);
  const [coverMediaId, setCoverMediaId] = useState<string | null>(album.coverMediaId);

  const isGroupAlbum = Boolean(album.groupId);
  const isSaving = updateAlbum.isPending || setCover.isPending;

  useEffect(() => {
    if (!isOpen) return;
    setTitle(album.title);
    setDescription(album.description ?? '');
    setPrivacy(album.privacy);
    setCoverMediaId(album.coverMediaId);
  }, [isOpen, album]);

  const hasChanges = useMemo(() => {
    const titleChanged = title.trim() !== album.title.trim();
    const descriptionChanged = description.trim() !== (album.description ?? '').trim();
    const privacyChanged = !isGroupAlbum && privacy !== album.privacy;
    const coverChanged = coverMediaId !== album.coverMediaId;
    return titleChanged || descriptionChanged || privacyChanged || coverChanged;
  }, [album, coverMediaId, description, isGroupAlbum, privacy, title]);

  const canSave = title.trim().length > 0 && hasChanges && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;

    const payload: {
      title?: string;
      description?: string;
      privacy?: AlbumPrivacy;
    } = {};

    if (title.trim() !== album.title.trim()) {
      payload.title = title.trim();
    }
    if (description.trim() !== (album.description ?? '').trim()) {
      payload.description = description.trim();
    }
    if (!isGroupAlbum && privacy !== album.privacy) {
      payload.privacy = privacy;
    }

    try {
      if (Object.keys(payload).length > 0) {
        await updateAlbum.mutateAsync(payload);
      }
      if (coverMediaId && coverMediaId !== album.coverMediaId) {
        await setCover.mutateAsync(coverMediaId);
      }
      toast.success('Đã cập nhật cài đặt album');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể cập nhật album');
    }
  };

  if (!isOpen) return null;

  const selectedCover = media.find((item) => item.id === coverMediaId) ?? media[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-lg font-bold text-foreground">Cài đặt album</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted dark:text-muted-foreground"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          <div>
            <label htmlFor="album-settings-title" className="mb-1.5 block text-sm font-semibold text-foreground">
              Tên album
            </label>
            <input
              id="album-settings-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-[15px] text-foreground outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{title.length}/150</p>
          </div>

          <div>
            <label htmlFor="album-settings-description" className="mb-1.5 block text-sm font-semibold text-foreground">
              Mô tả
            </label>
            <textarea
              id="album-settings-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={5000}
              placeholder="Ghi chú về album — chuyến đi, sự kiện, người tham gia..."
              className="w-full resize-none rounded-lg border border-border px-3 py-2.5 text-[15px] text-foreground outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{description.length}/5000</p>
          </div>

          {!isGroupAlbum ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">Quyền riêng tư</p>
              <div className="space-y-2">
                {ALBUM_PRIVACY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = privacy === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPrivacy(option.value)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${ active ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40' : 'border-border hover:bg-muted' }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${ active ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground' }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.hint}</p>
                      </div>
                      {active && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground">
              Album nhóm luôn hiển thị công khai với thành viên nhóm.
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Ảnh bìa</p>
            {selectedCover ? (
              <div className="mb-3 overflow-hidden rounded-xl border border-border">
                <ImageWithFallback
                  src={selectedCover.thumbnailUrl ?? selectedCover.url}
                  alt="Ảnh bìa album"
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            ) : (
              <p className="mb-3 text-sm text-muted-foreground">Chưa có ảnh trong album để chọn làm bìa.</p>
            )}
            {media.length > 0 && (
              <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
                {media.map((item) => {
                  const active = coverMediaId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCoverMediaId(item.id)}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${ active ? 'border-emerald-600 ring-2 ring-emerald-200' : 'border-transparent' }`}
                    >
                      {item.mediaType === 'VIDEO' ? (
                        <video src={item.url} className="h-full w-full object-cover" muted />
                      ) : (
                        <img src={item.thumbnailUrl ?? item.url} alt="" className="h-full w-full object-cover" />
                      )}
                      {active && (
                        <span className="absolute inset-0 flex items-center justify-center bg-emerald-600/25">
                          <Check className="h-5 w-5 text-white drop-shadow" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-border px-4 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 rounded-lg bg-muted py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
