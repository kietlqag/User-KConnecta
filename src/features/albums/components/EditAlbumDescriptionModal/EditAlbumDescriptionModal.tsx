import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateAlbum } from '../../hooks/useAlbums';

interface EditAlbumDescriptionModalProps {
  albumId: string;
  isOpen: boolean;
  initialDescription: string | null;
  onClose: () => void;
}

export function EditAlbumDescriptionModal({
  albumId,
  isOpen,
  initialDescription,
  onClose,
}: EditAlbumDescriptionModalProps) {
  const [description, setDescription] = useState(initialDescription ?? '');
  const updateAlbum = useUpdateAlbum(albumId);

  useEffect(() => {
    if (isOpen) setDescription(initialDescription ?? '');
  }, [isOpen, initialDescription]);

  const trimmed = description.trim();
  const initialTrimmed = (initialDescription ?? '').trim();
  const canSave = trimmed !== initialTrimmed;

  const handleSave = async () => {
    if (!canSave) return;
    try {
      await updateAlbum.mutateAsync({ description: trimmed });
      toast.success('Đã cập nhật mô tả album');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể cập nhật mô tả album');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">Sửa mô tả album</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="Ghi chú về album — chuyến đi, sự kiện, người tham gia..."
            className="w-full px-3 py-2.5 border border-border rounded-lg text-[15px] text-foreground outline-none resize-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{description.length}/5000</p>
        </div>
        <div className="flex gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={onClose}
            disabled={updateAlbum.isPending}
            className="flex-1 py-2.5 rounded-lg bg-background text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={updateAlbum.isPending || !canSave}
            className="flex-1 py-2.5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {updateAlbum.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {updateAlbum.isPending ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}
