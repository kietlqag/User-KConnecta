import { MessageCircle, Pin, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { liveService, type LivePinnedCommentResponse, type LiveSessionToolStateResponse } from '@/services/liveService';
import { postService, type PostCommentResponse } from '@/services/postService';
import { LiveCommentItem } from '../LiveCommentItem';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface LiveCommentPanelProps {
  postId?: string;
  sessionId?: string;
  hostUserId?: string;
  isHost?: boolean;
  disabled?: boolean;
  toolState?: LiveSessionToolStateResponse | null;
  onToolStateChange?: (state: LiveSessionToolStateResponse) => void;
  className?: string;
}

function sortComments(comments: PostCommentResponse[], pinnedCommentId?: string | null) {
  return [...comments].sort((a, b) => {
    if (pinnedCommentId) {
      if (a.id === pinnedCommentId) return -1;
      if (b.id === pinnedCommentId) return 1;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function patchCommentLike(
  comments: PostCommentResponse[],
  commentId: string,
  liked: boolean,
  likeCount: number,
) {
  return comments.map((comment) => (
    comment.id === commentId
      ? { ...comment, isLikedByCurrentUser: liked, likeCount }
      : comment
  ));
}

/** Preserve optimistic like/unlike while polling catches up; accept server when count is higher. */
function mergeCommentLists(
  previous: PostCommentResponse[],
  incoming: PostCommentResponse[],
) {
  const previousById = new Map(previous.map((comment) => [comment.id, comment]));
  return incoming.map((comment) => {
    const local = previousById.get(comment.id);
    if (!local) return comment;

    if (
      local.likeCount === comment.likeCount
      && local.isLikedByCurrentUser === comment.isLikedByCurrentUser
    ) {
      return comment;
    }

    if (local.isLikedByCurrentUser !== comment.isLikedByCurrentUser) {
      return {
        ...comment,
        likeCount: local.likeCount,
        isLikedByCurrentUser: local.isLikedByCurrentUser,
      };
    }

    if (comment.likeCount > local.likeCount) {
      return comment;
    }

    return {
      ...comment,
      likeCount: local.likeCount,
      isLikedByCurrentUser: local.isLikedByCurrentUser,
    };
  });
}

export function LiveCommentPanel({
  postId,
  sessionId,
  hostUserId,
  isHost = false,
  disabled = false,
  toolState,
  onToolStateChange,
  className = '',
}: LiveCommentPanelProps) {
  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.id ?? '';
  const currentUserAvatar = currentUser?.avatarUrl || '';
  const currentUserName = currentUser?.fullName?.trim() || currentUser?.username || 'Bạn';

  const [comments, setComments] = useState<PostCommentResponse[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<PostCommentResponse | null>(null);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [defaultPinnedComment, setDefaultPinnedComment] = useState<LivePinnedCommentResponse | null>(null);
  const [repliesByParent, setRepliesByParent] = useState<Record<string, PostCommentResponse[]>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const pinnedCommentId = toolState?.pinnedCommentId ?? null;

  const loadReplies = useCallback(async (parentCommentId: string) => {
    if (!postId) return;
    try {
      const data = await postService.getReplies(postId, parentCommentId, currentUserId || undefined);
      setRepliesByParent((prev) => ({
        ...prev,
        [parentCommentId]: mergeCommentLists(prev[parentCommentId] ?? [], data),
      }));
      setExpandedReplies((prev) => ({ ...prev, [parentCommentId]: true }));
    } catch {
      // Keep previous replies on failure.
    }
  }, [currentUserId, postId]);

  const loadComments = useCallback(async () => {
    if (!postId) return;
    try {
      const data = await postService.getComments(postId, 0, 50, currentUserId || undefined);
      setComments((prev) => mergeCommentLists(prev, data.content));
    } catch {
      setComments([]);
    }
  }, [currentUserId, postId]);

  useEffect(() => {
    void loadComments();
    if (!postId) return;
    const interval = window.setInterval(() => void loadComments(), 5000);
    return () => window.clearInterval(interval);
  }, [loadComments, postId]);

  useEffect(() => {
    if (!hostUserId) return;
    let cancelled = false;
    const loadDefaultPinned = async () => {
      try {
        const data = await liveService.getPinnedComment(hostUserId);
        if (!cancelled) setDefaultPinnedComment(data);
      } catch {
        if (!cancelled) setDefaultPinnedComment(null);
      }
    };
    void loadDefaultPinned();
    return () => {
      cancelled = true;
    };
  }, [hostUserId]);

  const sortedComments = useMemo(
    () => sortComments(comments, pinnedCommentId),
    [comments, pinnedCommentId],
  );

  const pinnedComment = useMemo(
    () => (pinnedCommentId ? comments.find((comment) => comment.id === pinnedCommentId) ?? null : null),
    [comments, pinnedCommentId],
  );

  const handleSubmitComment = async () => {
    const content = commentText.trim();
    if (!content || !currentUserId || !postId || isSendingComment || disabled) return;

    setIsSendingComment(true);
    try {
      const saved = await postService.addComment(postId, {
        userId: currentUserId,
        content,
        parentCommentId: replyTarget?.id,
      });
      setComments((prev) => [...prev, saved]);
      setCommentText('');
      if (replyTarget?.id) {
        await loadReplies(replyTarget.id);
      }
      setReplyTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể gửi bình luận.');
    } finally {
      setIsSendingComment(false);
    }
  };

  const handlePinComment = async (commentId: string | null) => {
    if (!sessionId || !isHost) return;
    try {
      const updated = await liveService.upsertSessionPinnedComment(sessionId, { commentId });
      onToolStateChange?.(updated);
      toast.success(commentId ? 'Đã ghim bình luận.' : 'Đã bỏ ghim bình luận.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể ghim bình luận.');
    }
  };

  const handleLikeChange = (commentId: string, liked: boolean, likeCount: number) => {
    setComments((prev) => patchCommentLike(prev, commentId, liked, likeCount));
    setRepliesByParent((prev) => {
      const next: Record<string, PostCommentResponse[]> = {};
      for (const [parentId, replies] of Object.entries(prev)) {
        next[parentId] = patchCommentLike(replies, commentId, liked, likeCount);
      }
      return next;
    });
  };

  const inputAvatar = currentUserAvatar?.trim() || '';
  const showDefaultPinned = Boolean(
    defaultPinnedComment?.enabled
    && defaultPinnedComment.commentText?.trim()
    && !pinnedComment,
  );

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl bg-gray-100 dark:bg-gray-900 p-3 text-gray-700 dark:text-gray-300">
        {showDefaultPinned && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
              <Pin className="h-3.5 w-3.5" />
              Bình luận ghim sẵn
            </div>
            <p className="text-sm text-amber-950">{defaultPinnedComment?.commentText}</p>
          </div>
        )}

        {pinnedComment && (
          <div className="mb-3">
            <LiveCommentItem
              comment={pinnedComment}
              isPinned
              isHost={isHost}
              pinnedCommentId={pinnedCommentId}
              disabled={disabled}
              onReply={setReplyTarget}
              onPin={(commentId) => void handlePinComment(commentId)}
              onLikeChange={handleLikeChange}
            />
          </div>
        )}

        {sortedComments.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center p-5 text-center text-gray-500 dark:text-gray-400">
            <MessageCircle className="mb-2 h-7 w-7" />
            <p className="font-semibold">Chưa có bình luận</p>
            <p className="text-sm">Bình luận đầu tiên sẽ hiển thị tại đây.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedComments
              .filter((comment) => comment.id !== pinnedCommentId)
              .map((comment) => (
                <div key={comment.id}>
                  <LiveCommentItem
                    comment={comment}
                    isHost={isHost}
                    pinnedCommentId={pinnedCommentId}
                    disabled={disabled}
                    onReply={setReplyTarget}
                    onPin={(commentId) => void handlePinComment(commentId)}
                    onLikeChange={handleLikeChange}
                  />
                  {comment.replyCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (expandedReplies[comment.id]) {
                          setExpandedReplies((prev) => ({ ...prev, [comment.id]: false }));
                          return;
                        }
                        void loadReplies(comment.id);
                      }}
                      className="ml-11 mt-1 text-xs font-semibold text-emerald-600 hover:underline"
                    >
                      {expandedReplies[comment.id]
                        ? 'Ẩn phản hồi'
                        : `Xem ${comment.replyCount} phản hồi`}
                    </button>
                  )}
                  {expandedReplies[comment.id] && (repliesByParent[comment.id] ?? []).map((reply) => (
                    <div key={reply.id} className="ml-8 mt-2">
                      <LiveCommentItem
                        comment={reply}
                        isHost={isHost}
                        pinnedCommentId={pinnedCommentId}
                        disabled={disabled}
                        onReply={setReplyTarget}
                        onPin={(commentId) => void handlePinComment(commentId)}
                        onLikeChange={handleLikeChange}
                      />
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>

      {replyTarget && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <span className="truncate">
            Đang trả lời <strong>{replyTarget.userFullName || replyTarget.username || 'người dùng'}</strong>
          </span>
          <button
            type="button"
            onClick={() => setReplyTarget(null)}
            className="rounded-full p-1 hover:bg-emerald-100"
            aria-label="Hủy trả lời"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-gray-200 dark:border-gray-700 pt-3">
        <UserAvatar
          name={currentUserName}
          avatarUrl={inputAvatar}
          userId={currentUser?.id}
          rounded="full"
          className="h-10 w-10 shrink-0"
        />
        <input
          value={commentText}
          disabled={disabled || !postId}
          onChange={(event) => setCommentText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleSubmitComment();
          }}
          className="flex-1 rounded-full bg-gray-100 dark:bg-gray-900 px-4 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:text-gray-400"
          placeholder={replyTarget ? 'Viết phản hồi...' : 'Viết bình luận...'}
        />
        <button
          type="button"
          disabled={!commentText.trim() || isSendingComment || disabled || !postId}
          onClick={() => void handleSubmitComment()}
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300 dark:bg-gray-600"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}
