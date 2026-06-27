import { useState } from 'react';
import { Pin, Reply, ThumbsUp } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { postService, type PostCommentResponse } from '@/services/postService';
import { authService } from '@/services/authService';

export function formatLiveCommentTime(createdAt: string) {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút`;

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

export function getCommentAvatar(comment: PostCommentResponse) {
  return comment.userAvatarUrl?.trim() || '';
}

interface LiveCommentItemProps {
  comment: PostCommentResponse;
  isPinned?: boolean;
  isHost?: boolean;
  pinnedCommentId?: string | null;
  disabled?: boolean;
  onReply?: (comment: PostCommentResponse) => void;
  onPin?: (commentId: string | null) => void;
  onLikeChange?: (commentId: string, liked: boolean, likeCount: number) => void;
}

export function LiveCommentItem({
  comment,
  isPinned = false,
  isHost = false,
  pinnedCommentId = null,
  disabled = false,
  onReply,
  onPin,
  onLikeChange,
}: LiveCommentItemProps) {
  const currentUser = authService.getCurrentUser();
  const [isLiking, setIsLiking] = useState(false);

  const displayName = comment.userFullName || comment.username || 'Người dùng';
  const isSessionPinned = pinnedCommentId === comment.id;
  const isLiked = comment.isLikedByCurrentUser;
  const likeCount = comment.likeCount;

  const handleLike = async () => {
    if (!currentUser?.id || disabled || isLiking) return;
    const prevLiked = isLiked;
    const prevCount = likeCount;
    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));
    onLikeChange?.(comment.id, nextLiked, nextCount);
    setIsLiking(true);
    try {
      if (nextLiked) {
        await postService.likeComment(comment.postId, comment.id, currentUser.id);
      } else {
        await postService.unlikeComment(comment.postId, comment.id, currentUser.id);
      }
    } catch {
      onLikeChange?.(comment.id, prevLiked, prevCount);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className={`rounded-xl px-3 py-2.5 ${isPinned || isSessionPinned ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-card shadow-sm dark:shadow-none'}`}>
      <div className="flex gap-2.5">
        <UserAvatar
          name={displayName}
          avatarUrl={comment.userAvatarUrl}
          userId={comment.userId}
          rounded="full"
          className="h-9 w-9 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
            <span className="text-xs text-muted-foreground">{formatLiveCommentTime(comment.createdAt)}</span>
            {(isPinned || isSessionPinned) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                <Pin className="h-3 w-3" />
                Đã ghim
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-foreground break-words">{comment.content}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs font-semibold">
            <button
              type="button"
              disabled={disabled || isLiking}
              onClick={() => void handleLike()}
              className={`inline-flex items-center gap-1 transition-colors disabled:cursor-not-allowed ${ isLiked ? 'text-emerald-600' : 'text-muted-foreground hover:text-emerald-600' }`}
            >
              <ThumbsUp className={`h-3.5 w-3.5 ${isLiked ? 'fill-current' : ''}`} />
              {likeCount > 0 ? likeCount : 'Thích'}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onReply?.(comment)}
              className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-emerald-600 disabled:cursor-not-allowed"
            >
              <Reply className="h-3.5 w-3.5" />
              Trả lời
            </button>
            {isHost && onPin && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => void onPin(isSessionPinned ? null : comment.id)}
                className={`inline-flex items-center gap-1 transition-colors disabled:cursor-not-allowed ${ isSessionPinned ? 'text-amber-700' : 'text-muted-foreground hover:text-amber-700' }`}
              >
                <Pin className="h-3.5 w-3.5" />
                {isSessionPinned ? 'Bỏ ghim' : 'Ghim'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
