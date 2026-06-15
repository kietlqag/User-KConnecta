import { useState, useEffect, useRef } from 'react';
import { X, MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { postService, type PostCommentResponse } from '@/services/postService';
import { ReactionButton, reactions, type ReactionOption } from '@/components/reactions';

interface CommentsPanelProps {
  postId: string;
  onClose: () => void;
  onCommentCountChange?: (delta: number) => void;
}

interface PanelCommentRowProps {
  comment: PostCommentResponse;
  postId: string;
  currentUser: ReturnType<typeof authService.getCurrentUser>;
  onDelete: (commentId: string) => void;
  onCommentCountChange?: (delta: number) => void;
  depth?: number;
}

function PanelCommentRow({
  comment: initialComment,
  postId,
  currentUser,
  onDelete,
  onCommentCountChange,
  depth = 0,
}: PanelCommentRowProps) {
  const [comment, setComment] = useState(initialComment);
  const [selectedReaction, setSelectedReaction] = useState<ReactionOption | null>(
    initialComment.isLikedByCurrentUser ? reactions[0] : null,
  );
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replies, setReplies] = useState<PostCommentResponse[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const replyInputRef = useRef<HTMLInputElement>(null);

  const totalReplies = Math.max(comment.replyCount ?? 0, replies.length);

  useEffect(() => {
    if (showReplyInput) setTimeout(() => replyInputRef.current?.focus(), 50);
  }, [showReplyInput]);

  const fetchReplies = () => postService.getReplies(postId, comment.id, currentUser?.id);

  const handleShowReplies = async () => {
    if (showReplies) { setShowReplies(false); return; }
    if (!repliesLoaded) {
      setIsLoadingReplies(true);
      try {
        const data = await fetchReplies();
        setReplies(data);
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

  const handleReplySubmit = async () => {
    if (!replyText.trim() || !currentUser) return;
    setIsSubmittingReply(true);
    try {
      const response = await postService.addComment(postId, {
        userId: currentUser.id,
        content: replyText.trim(),
        parentCommentId: comment.id,
      });
      setReplyText('');
      setShowReplyInput(false);
      const data = await fetchReplies();
      setReplies(data);
      setRepliesLoaded(true);
      setShowReplies(true);
      if (response.moderationStatus === 'PENDING') {
        toast.info('Phản hồi đang chờ kiểm duyệt. Chỉ bạn thấy cho đến khi được duyệt.');
      } else {
        setComment(prev => ({ ...prev, replyCount: (prev.replyCount ?? 0) + 1 }));
        onCommentCountChange?.(1);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể gửi trả lời');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleReactionChange = async (reaction: ReactionOption | null) => {
    if (!currentUser) { toast.error('Bạn cần đăng nhập'); return; }
    const wasLiked = comment.isLikedByCurrentUser;
    const adding = reaction !== null;
    setComment(prev => ({
      ...prev,
      isLikedByCurrentUser: adding,
      likeCount: adding ? (wasLiked ? prev.likeCount : prev.likeCount + 1) : Math.max(0, prev.likeCount - 1),
    }));
    setSelectedReaction(reaction);
    try {
      if (adding) await postService.likeComment(postId, comment.id, currentUser.id);
      else await postService.unlikeComment(postId, comment.id, currentUser.id);
    } catch {
      setComment(prev => ({
        ...prev,
        isLikedByCurrentUser: wasLiked,
        likeCount: wasLiked ? prev.likeCount : Math.max(0, prev.likeCount - 1),
      }));
      setSelectedReaction(wasLiked ? reactions[0] : null);
      toast.error('Không thể thực hiện');
    }
  };

  const handleDelete = async () => {
    if (!currentUser) return;
    setOpenMenu(false);
    setIsDeleting(true);
    try {
      await postService.deleteComment(postId, comment.id, currentUser.id);
      onDelete(comment.id);
      onCommentCountChange?.(-1);
    } catch {
      toast.error('Không thể xóa bình luận');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteReply = (replyId: string) => {
    setReplies(prev => prev.filter(r => r.id !== replyId));
    setComment(prev => ({ ...prev, replyCount: Math.max(0, (prev.replyCount ?? 0) - 1) }));
  };

  const avatarSrc = (name: string | undefined, url?: string | null) =>
    url || `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(name || 'User')}`;

  const indentPx = depth > 0 ? Math.min(depth, 3) * 20 : 0;
  const isOwner = currentUser?.id === comment.userId;

  return (
    <div style={{ marginLeft: indentPx }}>
      <div className="flex gap-2 items-start">
        <img
          src={avatarSrc(comment.userFullName, comment.userAvatarUrl)}
          alt={comment.userFullName}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="relative">
            {isOwner && (
              <div className="absolute right-1 top-1 z-10">
                <button
                  onClick={() => setOpenMenu(prev => !prev)}
                  disabled={isDeleting}
                  className="w-7 h-7 rounded-full hover:bg-gray-700/80 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                >
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </button>
                {openMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(false)} />
                    <div className="absolute right-0 top-8 z-50 w-40 rounded-xl bg-[#2a2d31] border border-gray-700 shadow-xl py-1">
                      <button
                        onClick={() => void handleDelete()}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        Xóa bình luận
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="bg-[#2a2d31] rounded-2xl px-3 py-2 pr-8 w-full">
              <h4 className="text-white font-semibold text-sm leading-tight">{comment.userFullName}</h4>
              {comment.moderationStatus === 'PENDING' && (
                <p className="mt-1 text-[11px] font-medium text-amber-400">Đang chờ kiểm duyệt</p>
              )}
              {comment.moderationStatus === 'REJECTED' && (
                <p className="mt-1 text-[11px] font-medium text-red-400">
                  {comment.moderationFailReason || 'Bình luận không được duyệt'}
                </p>
              )}
              <p className="text-gray-200 text-sm mt-0.5 break-words">{comment.content}</p>
            </div>
          </div>

          <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            <ReactionButton
              compact
              initialReaction={selectedReaction}
              onReactionChange={handleReactionChange}
              buttonClassName="shrink-0 hover:bg-gray-700/60 text-gray-400 [&.text-muted-foreground]:text-gray-400"
            />
            {comment.likeCount > 0 && (
              <span className="text-xs text-gray-500 shrink-0">{comment.likeCount}</span>
            )}

            <button
              onClick={() => setShowReplyInput(v => !v)}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-gray-400 hover:bg-gray-700/60 hover:text-white transition-colors cursor-pointer"
            >
              Trả lời
            </button>
          </div>

          {showReplyInput && (
            <div className={`flex items-center gap-2 mt-2 min-w-0 ${isSubmittingReply ? 'opacity-60 pointer-events-none' : ''}`}>
              <img
                src={avatarSrc(currentUser?.fullName, currentUser?.avatarUrl)}
                alt=""
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              />
              <input
                ref={replyInputRef}
                type="text"
                placeholder={`Trả lời ${comment.userFullName}...`}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleReplySubmit(); }
                  if (e.key === 'Escape') { setShowReplyInput(false); setReplyText(''); }
                }}
                className="flex-1 min-w-0 bg-[#2a2d31] text-white rounded-full px-3 py-1.5 text-xs outline-none focus:bg-[#35383d] transition-colors"
              />
            </div>
          )}

          {totalReplies > 0 && (
            <button
              onClick={() => void handleShowReplies()}
              disabled={isLoadingReplies}
              className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white hover:underline mt-2 py-0.5 cursor-pointer disabled:opacity-60 transition-colors"
            >
              <div className="w-5 h-px bg-gray-600 shrink-0" />
              {isLoadingReplies ? 'Đang tải...' : showReplies ? 'Ẩn phản hồi' : `${totalReplies} phản hồi`}
            </button>
          )}
        </div>
      </div>

      {showReplies && replies.length > 0 && (
        <div className="mt-2 space-y-3">
          {replies.map(reply => (
            <PanelCommentRow
              key={reply.id}
              comment={reply}
              postId={postId}
              currentUser={currentUser}
              onDelete={handleDeleteReply}
              onCommentCountChange={onCommentCountChange}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const CommentsPanel = ({ postId, onClose, onCommentCountChange }: CommentsPanelProps) => {
  const [comments, setComments] = useState<PostCommentResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    let isMounted = true;
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        const response = await postService.getComments(postId, 0, 20, currentUser?.id);
        if (isMounted) {
          setComments(response.content.filter(c => !c.parentCommentId));
          setTotalElements(response.totalElements);
        }
      } catch {
        if (isMounted) toast.error('Không thể tải bình luận');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void fetchComments();
    return () => { isMounted = false; };
  }, [postId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (!currentUser) { toast.error('Bạn cần đăng nhập để bình luận'); return; }
    try {
      setIsSubmitting(true);
      const response = await postService.addComment(postId, {
        userId: currentUser.id,
        content: newComment.trim(),
      });
      setComments(prev => [...prev, response]);
      setNewComment('');
      if (response.moderationStatus === 'PENDING') {
        toast.info('Bình luận đang chờ kiểm duyệt. Chỉ bạn thấy cho đến khi được duyệt.');
      } else {
        setTotalElements(n => n + 1);
        onCommentCountChange?.(1);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể gửi bình luận');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    setTotalElements(n => Math.max(0, n - 1));
    onCommentCountChange?.(-1);
  };

  return (
    <div className="w-[400px] bg-[#1c1e21] h-full flex flex-col border-l border-gray-800">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h2 className="text-white font-semibold text-lg">Bình luận ({totalElements})</h2>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-gray-200" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="text-gray-400 text-center text-sm">Đang tải bình luận...</div>
        ) : comments.length === 0 ? (
          <div className="text-gray-400 text-center text-sm">Chưa có bình luận nào</div>
        ) : (
          comments.map(comment => (
            <PanelCommentRow
              key={comment.id}
              comment={comment}
              postId={postId}
              currentUser={currentUser}
              onDelete={handleDeleteComment}
              onCommentCountChange={onCommentCountChange}
            />
          ))
        )}
      </div>

      <div className={`p-4 border-t border-gray-800 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2">
          <img
            src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(currentUser?.fullName || 'User')}`}
            alt="Your avatar"
            className="w-8 h-8 rounded-full object-cover"
          />
          <input
            type="text"
            placeholder="Viết bình luận..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleAddComment(); } }}
            className="flex-1 bg-[#2a2d31] text-white rounded-full px-4 py-2 text-sm outline-none focus:bg-[#35383d] transition-colors"
          />
        </div>
      </div>
    </div>
  );
};
