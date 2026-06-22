import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useShareAlbum } from '../../hooks/useAlbums';

interface AlbumShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  albumId: string;
  albumTitle: string;
}

export function AlbumShareModal({ isOpen, onClose, albumId, albumTitle }: AlbumShareModalProps) {
  const shareAlbum = useShareAlbum(albumId);
  const [message, setMessage] = useState('');
  const [shareToFeed, setShareToFeed] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setShareToFeed(true);
    }
  }, [isOpen]);

  const handleShare = async () => {
    try {
      const result = await shareAlbum.mutateAsync({ message: message.trim() || undefined, shareToFeed });
      if (shareToFeed && result.postId) {
        toast.success('Đã chia sẻ album lên bảng tin');
      } else {
        toast.success('Đã ghi nhận chia sẻ album');
      }
      onClose();
    } catch {
      toast.error('Không thể chia sẻ album');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Chia sẻ album</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Chia sẻ <span className="font-semibold text-gray-900 dark:text-gray-100">{albumTitle}</span>
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Viết gì đó về album này... (tuỳ chọn)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none resize-none focus:ring-1 focus:ring-blue-500"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={shareToFeed}
              onChange={(e) => setShareToFeed(e.target.checked)}
              className="rounded border-gray-300"
            />
            Đăng lên bảng tin (chủ album sẽ nhận thông báo)
          </label>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-muted rounded-lg">
            Huỷ
          </button>
          <button
            type="button"
            disabled={shareAlbum.isPending}
            onClick={() => void handleShare()}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {shareAlbum.isPending ? 'Đang chia sẻ...' : 'Chia sẻ'}
          </button>
        </div>
      </div>
    </div>
  );
}
