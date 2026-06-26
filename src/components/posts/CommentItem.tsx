import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Trash2, Pencil, Flag, Clock, X } from 'lucide-react';
import { CommentInput } from './CommentInput';
import { authService } from '@/services/authService';
import { postService, type ReactionType } from '@/services/postService';
import {
  ReactionButton,
  reactions,
  getActiveReactions,
  getTotalReactionCount,
  type ReactionOption,
  type ReactionCountMap,
} from '@/components/reactions';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/shared/UserAvatar';

export interface Comment {
  id: string;
  postId: string;
  userId: string | null;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  imageUrl?: string | null;
  timestamp: string;
  likeCount: number;
  isLikedByCurrentUser: boolean;
  myReaction?: ReactionType | null;
  reactionCounts?: Record<string, number> | null;
  isDeleted: boolean;
  replyCount: number;
  replies?: Comment[];
  /** Chỉ có giá trị cho comment của chính người xem: APPROVED | PENDING | REJECTED. */
  moderationStatus?: string | null;
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

function recordToCountMap(rec?: Record<string, number> | null): ReactionCountMap {
  const map: ReactionCountMap = { LIKE: 0, LOVE: 0, HAHA: 0, WOW: 0, SAD: 0, ANGRY: 0 };
  if (rec) {
    (Object.keys(map) as ReactionType[]).forEach((k) => {
      if (typeof rec[k] === 'number') map[k] = rec[k];
    });
  }
  return map;
}

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
  const [myReaction, setMyReaction] = useState<ReactionOption | null>(
    comment.myReaction ? reactions.find((r) => r.type === comment.myReaction) ?? null : null,
  );
  const [reactionCounts, setReactionCounts] = useState<ReactionCountMap>(recordToCountMap(comment.reactionCounts));
  const [showImageViewer, setShowImageViewer] = useState(false);
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
  const totalReactions = getTotalReactionCount(reactionCounts);
  const activeReactions = getActiveReactions(reactionCounts);

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
        avatar: r.userAvatarUrl || '',
      },
      content: r.content ?? '',
      imageUrl: r.imageUrl ?? null,
      myReaction: r.myReaction ?? null,
      reactionCounts: r.reactionCounts ?? null,
      timestamp: formatCommentTime(r.createdAt),
      likeCount: r.likeCount,
      isLikedByCurrentUser: r.isLikedByCurrentUser,
      isDeleted: r.isDeleted,
      replyCount: r.replyCount,
      replies: [],
      moderationStatus: r.moderationStatus,
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

  const handleReact = async (reaction: ReactionOption | null) => {
    if (!currentUser || isDeletedState) return;
    const prevReaction = myReaction;
    const prevCounts = reactionCounts;
    // Cập nhật lạc quan: gỡ reaction cũ, cộng reaction mới.
    const nextCounts = { ...reactionCounts };
    if (prevReaction) nextCounts[prevReaction.type] = Math.max(0, nextCounts[prevReaction.type] - 1);
    if (reaction) nextCounts[reaction.type] = nextCounts[reaction.type] + 1;
    setReactionCounts(nextCounts);
    setMyReaction(reaction);
    try {
      if (reaction) await postService.likeComment(comment.postId, comment.id, currentUser.id, reaction.type);
      else await postService.unlikeComment(comment.postId, comment.id, currentUser.id);
    } catch {
      setReactionCounts(prevCounts);
      setMyReaction(prevReaction);
      toast.error('Không thể thực hiện thao tác');
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

  const handleReport = async () => {
    setShowMenu(false);
    if (!currentUser) return;
    try {
      await postService.reportComment(comment.id, currentUser.id);
      toast.success('Đã gửi báo cáo. Cảm ơn bạn đã góp phần giữ cộng đồng an toàn!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không thể gửi báo cáo');
    }
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
        <div className="flex items-center gap-3 rounded-2xl bg-gray-100 dark:bg-gray-900 px-4 py-3">
          <p className="flex-1 text-sm text-gray-500 dark:text-gray-400 italic">Bình luận đã bị xóa.</p>
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
        <div className="text-sm text-gray-400 italic px-1 py-1 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
          Bình luận đã bị xóa.
        </div>

        {totalReplies > 0 && (
          <div className="mt-1">
            <button
              onClick={() => void handleShowReplies()}
              disabled={isLoadingReplies}
              className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:underline px-3 cursor-pointer disabled:opacity-60"
            >
              <div className="w-6 h-0.5 bg-gray-300 dark:bg-gray-600" />
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
        <div className="w-8 h-8 shrink-0">
          <UserAvatar
            name={comment.author.name}
            avatarUrl={comment.author.avatar}
            userId={comment.userId ?? undefined}
            className="w-8 h-8"
            rounded="full"
            initialsClassName="text-xs font-bold"
          />
        </div>
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
                className="w-full rounded-2xl bg-gray-100 dark:bg-gray-900 px-3 py-2 text-[15px] outline-none resize-none focus:ring-2 focus:ring-emerald-400"
              />
              <div className="flex gap-2 mt-1 px-1 text-xs text-gray-500 dark:text-gray-400">
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
                  className="font-semibold text-gray-600 dark:text-gray-400 hover:underline cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <div className="inline-block max-w-full">
              {/* Bong bóng chỉ bọc tên + chữ; ảnh tách riêng bên dưới (giống Facebook) */}
              <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl px-3 py-2 inline-block max-w-full">
                <p className="font-semibold text-[13px] mb-0.5">{comment.author.name}</p>
                {comment.content && <p className="text-[15px] break-words">{comment.content}</p>}
              </div>
              {comment.imageUrl && (
                <button type="button" onClick={() => setShowImageViewer(true)} className="mt-1.5 block w-fit cursor-pointer">
                  <img
                    src={comment.imageUrl}
                    alt="Ảnh bình luận"
                    className="max-h-72 max-w-[260px] rounded-xl border border-gray-200 dark:border-gray-700 object-contain"
                  />
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-1 px-1">
            <ReactionButton
              compact
              initialReaction={myReaction}
              onReactionChange={(r) => void handleReact(r)}
              buttonClassName="!gap-1 !px-0 !py-0 !text-xs !font-semibold !rounded-none [&>svg]:hidden [&_img]:w-4 [&_img]:h-4 hover:!bg-transparent"
            />
            <button
              onClick={() => setShowReplyInput((v) => !v)}
              className="text-xs font-semibold text-gray-600 dark:text-gray-400 hover:underline cursor-pointer"
            >
              Trả lời
            </button>
            {comment.moderationStatus === 'PENDING' && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Đang chờ duyệt
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">{comment.timestamp}</span>
            {totalReactions > 0 && (
              <div className="flex items-center gap-1">
                <div className="flex items-center -space-x-1">
                  {activeReactions.slice(0, 3).map((r) => (
                    <img key={r.type} src={r.emoji} alt={r.label} width={14} height={14} className="rounded-full" draggable={false} />
                  ))}
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400">{totalReactions}</span>
              </div>
            )}
          </div>

          {/* Inline reply input */}
          {showReplyInput && (
            <div className={`mt-2 ${isSubmittingReply ? 'pointer-events-none opacity-70' : ''}`}>
              <CommentInput
                onSubmit={handleReplySubmit}
                userName={currentUser?.fullName}
                userId={currentUser?.id}
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
                className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:underline px-3 cursor-pointer disabled:opacity-60"
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

        {/* More menu — chủ comment thấy Sửa/Xóa, người khác thấy Báo cáo */}
        {currentUser && (
          <div className="relative h-fit" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="p-1 hover:bg-muted rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-7 z-20 w-40 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 py-1 overflow-hidden">
                  {isOwner ? (
                    <>
                      <button
                        onClick={() => { setShowMenu(false); setIsEditing(true); setEditContent(comment.content); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-muted transition-colors cursor-pointer"
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
                    </>
                  ) : (
                    <button
                      onClick={() => void handleReport()}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Flag className="w-4 h-4" />
                      Báo cáo
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Lightbox: xem ảnh bình luận ngay trong app */}
      {showImageViewer && comment.imageUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowImageViewer(false)}
        >
          <button
            type="button"
            onClick={() => setShowImageViewer(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"
            title="Đóng"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={comment.imageUrl}
            alt="Ảnh bình luận"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
