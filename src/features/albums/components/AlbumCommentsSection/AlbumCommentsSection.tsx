import { useState } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/shared';
import { authService } from '@/services/authService';
import { useAddAlbumComment, useAlbumComments } from '../../hooks/useAlbums';

interface AlbumCommentsSectionProps {
  albumId: string;
}

export function AlbumCommentsSection({ albumId }: AlbumCommentsSectionProps) {
  const currentUser = authService.getCurrentUser();
  const { data: comments = [], isLoading } = useAlbumComments(albumId);
  const addComment = useAddAlbumComment(albumId);
  const [text, setText] = useState('');

  const handleSubmit = async () => {
    const content = text.trim();
    if (!content) return;
    try {
      await addComment.mutateAsync(content);
      setText('');
      toast.success('Đã gửi bình luận');
    } catch {
      toast.error('Không thể gửi bình luận');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mt-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
        Bình luận {comments.length > 0 && `(${comments.length})`}
      </h2>

      <div className="flex gap-3 mb-5">
        <UserAvatar
          avatarUrl={currentUser?.avatarUrl}
          name={currentUser?.fullName ?? 'Bạn'}
          userId={currentUser?.id}
          className="w-9 h-9 shrink-0"
          rounded="full"
          initialsClassName="text-sm font-bold"
        />
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
            placeholder="Viết bình luận..."
            className="flex-1 px-3 py-2 rounded-full bg-muted text-sm outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            disabled={!text.trim() || addComment.isPending}
            onClick={() => void handleSubmit()}
            className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            aria-label="Gửi"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500 text-center py-4">Đang tải bình luận...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Chưa có bình luận nào</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <UserAvatar
                avatarUrl={comment.userAvatarUrl}
                name={comment.userName}
                userId={comment.userId}
                className="w-9 h-9 shrink-0"
                rounded="full"
                initialsClassName="text-sm font-bold"
              />
              <div className="flex-1 min-w-0">
                <div className="inline-block max-w-full rounded-2xl bg-muted px-3 py-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{comment.userName}</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 break-words">{comment.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-1">
                  {new Date(comment.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
