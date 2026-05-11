import { useEffect, useRef, useState } from 'react';
import { ThumbsUp, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { CommentInput } from './CommentInput';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';
import { toast } from 'sonner';

export interface Comment {
  id: string;
  postId: string;
  userId: string | null;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  likeCount: number;
  isLikedByCurrentUser: boolean;
  isDeleted: boolean;
  replyCount: number;
  replies?: Comment[];
}

interface CommentItemProps {
  comment: Comment;
  depth?: number;
  isOrphan?: boolean;
  onReply: (content: string, parentId: string) => Promise<void>;
  onDelete: (commentId: string) => void;
  onUpdate: (commentId: string, newContent: string) => void;
}

const UNDO_DELAY_MS = 5000;

function formatCommentTime(createdAt: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(createdAt));
}

export function CommentItem({ comment, depth = 0, isOrphan = false, onReply, onDelete, onUpdate }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Comment[]>(comment.replies ?? []);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [isLiked, setIsLiked] = useState(comment.isLikedByCurrentUser);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [isLiking, setIsLiking] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [countdown, setCountdown] = useState(Math.ceil(UNDO_DELAY_MS / 1000));
  const [isSoftDeleted, setIsSoftDeleted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentUser = authService.getCurrentUser();
  const indent = Math.min(depth, 4) * 40;
  const isOwner = currentUser?.id === comment.userId;
  const totalReplies = Math.max(comment.replyCount, replies.length);
  const isDeletedState = comment.isDeleted || isSoftDeleted;

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const loadReplies = async () => {
    const data = await postService.getReplies(comment.postId, comment.id, currentUser?.id);
    const mapped: Comment[] = data.map((r) => ({
      id: r.id,
      postId: r.postId,
      userId: r.userId,
      author: {
        name: r.userFullName ?? '',
        avatar: r.userAvatarUrl || `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(r.userFullName || 'User')}`,
      },
      content: r.content ?? '',
      timestamp: formatCommentTime(r.createdAt),
      likeCount: r.likeCount,
      isLikedByCurrentUser: r.isLikedByCurrentUser,
      isDeleted: r.isDeleted,
      replyCount: r.replyCount,
      replies: [],
    }));
    return mapped;
  };

  const handleShowReplies = async () => {
    if (showReplies) { setShowReplies(false); return; }
    if (!repliesLoaded) {
      try {
        setIsLoadingReplies(true);
        const mapped = await loadReplies();
        setReplies(mapped);
        setRepliesLoaded(true);
      } catch {
        toast.error('Không thể tải phản hồi');
        return;
      } finally {
        setIsLoadingReplies(false);
      }
    }
    setShowReplies(true);
  };

  const handleReplySubmit = async (content: string) => {
    try {
      setIsSubmittingReply(true);
      await onReply(content, comment.id);
      setShowReplyInput(false);
      const mapped = await loadReplies();
      setReplies(mapped);
      setRepliesLoaded(true);
      setShowReplies(true);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleLike = async () => {
    if (!currentUser || isLiking || isDeletedState) return;
    const next = !isLiked;
    setIsLiked(next);
    setLikeCount((n) => n + (next ? 1 : -1));
    try {
      setIsLiking(true);
      if (next) await postService.likeComment(comment.postId, comment.id, currentUser.id);
      else await postService.unlikeComment(comment.postId, comment.id, currentUser.id);
    } catch {
      setIsLiked(!next);
      setLikeCount((n) => n + (next ? -1 : 1));
      toast.error('Không thể thực hiện thao tác');
    } finally {
      setIsLiking(false);
    }
  };

  const startDeleteCountdown = () => {
    setShowMenu(false);
    setPendingDelete(true);
    setCountdown(Math.ceil(UNDO_DELAY_MS / 1000));

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    deleteTimerRef.current = setTimeout(async () => {
      if (!currentUser) return;
      try {
        const result = await postService.deleteComment(comment.postId, comment.id, currentUser.id);
        if (result.softDeleted) {
          // Còn con → soft delete: giữ placeholder tại chỗ
          setPendingDelete(false);
          setIsSoftDeleted(true);
        } else {
          // Không có con → hard delete: xóa khỏi danh sách cha
          onDelete(comment.id);
        }
      } catch {
        setPendingDelete(false);
        toast.error('Không thể xóa bình luận');
      }
    }, UNDO_DELAY_MS);
  };

  const handleUndo = () => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setPendingDelete(false);
    setCountdown(Math.ceil(UNDO_DELAY_MS / 1000));
  };

  const handleDeleteReply = (replyId: string) => {
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
  };

  const handleUpdateReply = (replyId: string, newContent: string) => {
    setReplies((prev) => prev.map((r) => r.id === replyId ? { ...r, content: newContent } : r));
  };

  const handleSaveEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === comment.content || !currentUser) return;
    try {
      setIsSavingEdit(true);
      await postService.updateComment(comment.postId, comment.id, { userId: currentUser.id, content: trimmed });
      onUpdate(comment.id, trimmed);
      setIsEditing(false);
    } catch {
      toast.error('Không thể chỉnh sửa bình luận');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ── Pending delete state ─────────────────────────────────────────
  if (pendingDelete) {
    return (
      <div style={{ marginLeft: depth > 0 ? indent : 0 }}>
        <div className="flex items-center gap-3 rounded-2xl bg-gray-100 px-4 py-3">
          <p className="flex-1 text-sm text-gray-500 italic">Bình luận đã bị xóa.</p>
          <button
            onClick={handleUndo}
            className="text-sm font-semibold text-emerald-600 hover:underline cursor-pointer whitespace-nowrap"
          >
            Hoàn tác ({countdown}s)
          </button>
        </div>
      </div>
    );
  }

  // ── Soft-deleted placeholder (has children) ──────────────────────
  if (isDeletedState) {
    return (
      <div style={{ marginLeft: depth > 0 ? indent : 0 }}>
        <div className="text-sm text-gray-400 italic px-1 py-1 border-l-2 border-gray-200 pl-3">
          Bình luận đã bị xóa.
        </div>

        {totalReplies > 0 && (
          <div className="mt-1">
            <button
              onClick={() => void handleShowReplies()}
              disabled={isLoadingReplies}
              className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:underline px-3 cursor-pointer disabled:opacity-60"
            >
              <div className="w-6 h-0.5 bg-gray-300" />
              {isLoadingReplies ? 'Đang tải...' : showReplies ? 'Ẩn phản hồi' : `${totalReplies} phản hồi`}
            </button>

            {showReplies && (
              <div className="space-y-3 mt-2">
                {replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    depth={depth + 1}
                    isOrphan
                    onReply={onReply}
                    onDelete={handleDeleteReply}
                    onUpdate={handleUpdateReply}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Normal comment ───────────────────────────────────────────────
  return (
    <div style={{ marginLeft: depth > 0 ? indent : 0 }}>
      {/* Orphan label */}
      {isOrphan && (
        <p className="text-xs text-gray-400 italic mb-1 px-1">
          Phản hồi cho một bình luận đã bị ẩn
        </p>
      )}

      <div className="flex gap-2 group">
        <img
          src={comment.author.avatar}
          alt={comment.author.name}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1">
          {/* Comment Bubble / Edit mode */}
          {isEditing ? (
            <div className="flex-1 max-w-full">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSaveEdit(); }
                  if (e.key === 'Escape') { setIsEditing(false); setEditContent(comment.content); }
                }}
                rows={2}
                autoFocus
                className="w-full rounded-2xl bg-gray-100 px-3 py-2 text-[15px] outline-none resize-none focus:ring-2 focus:ring-emerald-400"
              />
              <div className="flex gap-2 mt-1 px-1 text-xs text-gray-500">
                <span>Enter để lưu · Esc để hủy</span>
                <button
                  onClick={() => void handleSaveEdit()}
                  disabled={isSavingEdit || !editContent.trim() || editContent.trim() === comment.content}
                  className="ml-auto font-semibold text-emerald-600 hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEdit ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button
                  onClick={() => { setIsEditing(false); setEditContent(comment.content); }}
                  className="font-semibold text-gray-600 hover:underline cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-2xl px-3 py-2 inline-block max-w-full">
              <p className="font-semibold text-[13px] mb-0.5">{comment.author.name}</p>
              <p className="text-[15px] break-words">{comment.content}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-1 px-3">
            <button
              onClick={() => void handleLike()}
              disabled={isLiking}
              className={`text-xs font-semibold hover:underline cursor-pointer disabled:opacity-60 ${isLiked ? 'text-blue-600' : 'text-gray-600'}`}
            >
              Thích
            </button>
            <button
              onClick={() => setShowReplyInput((v) => !v)}
              className="text-xs font-semibold text-gray-600 hover:underline cursor-pointer"
            >
              Trả lời
            </button>
            <span className="text-xs text-gray-500">{comment.timestamp}</span>
            {likeCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <ThumbsUp className="w-2.5 h-2.5 text-white fill-white" />
                </div>
                <span className="text-xs text-gray-600">{likeCount}</span>
              </div>
            )}
          </div>

          {/* Inline reply input */}
          {showReplyInput && (
            <div className={`mt-2 ${isSubmittingReply ? 'pointer-events-none opacity-70' : ''}`}>
              <CommentInput
                onSubmit={handleReplySubmit}
                userAvatar={currentUser?.avatarUrl}
                placeholder={`Trả lời ${comment.author.name}...`}
                autoFocus
              />
            </div>
          )}

          {/* Replies toggle */}
          {totalReplies > 0 && (
            <div className="mt-2">
              <button
                onClick={() => void handleShowReplies()}
                disabled={isLoadingReplies}
                className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:underline px-3 cursor-pointer disabled:opacity-60"
              >
                <div className="w-6 h-0.5 bg-gray-400" />
                {isLoadingReplies
                  ? 'Đang tải...'
                  : showReplies
                    ? 'Ẩn phản hồi'
                    : `${totalReplies} phản hồi`}
              </button>

              {showReplies && (
                <div className="space-y-3 mt-2">
                  {replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      depth={depth + 1}
                      onReply={onReply}
                      onDelete={handleDeleteReply}
                      onUpdate={handleUpdateReply}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* More menu — chỉ hiện khi là chủ comment */}
        {isOwner && (
          <div className="relative h-fit" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="p-1 hover:bg-gray-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-600" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-7 z-20 w-40 rounded-xl bg-white shadow-lg border border-gray-200 py-1 overflow-hidden">
                  <button
                    onClick={() => { setShowMenu(false); setIsEditing(true); setEditContent(comment.content); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                    Chỉnh sửa
                  </button>
                  <button
                    onClick={startDeleteCountdown}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa bình luận
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
