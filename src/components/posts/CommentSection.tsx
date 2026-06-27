import { useEffect, useState, useCallback, useRef } from 'react';
import { FileText, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { postService, type PostCommentResponse } from '@/services/postService';
import { CommentInput } from './CommentInput';
import { CommentItem, type Comment } from './CommentItem';

interface CommentSectionProps {
  postId: string;
  onCommentAdded?: () => void;
  onCommentsLoaded?: (count: number) => void;
}

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất', desc: 'Hiển thị bình luận mới nhất trước tiên.', sort: 'createdAt,desc' },
  { value: 'oldest', label: 'Cũ nhất', desc: 'Hiển thị bình luận cũ nhất trước tiên.', sort: 'createdAt,asc' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

function formatCommentTime(createdAt: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(createdAt));
}

function mapToComment(r: PostCommentResponse): Comment {
  return {
    id: r.id,
    postId: r.postId,
    userId: r.userId,
    author: {
      name: r.userFullName,
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
  };
}

export function CommentSection({ postId, onCommentAdded, onCommentsLoaded }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<SortValue>('oldest');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const activeSort = SORT_OPTIONS.find((o) => o.value === sortBy) ?? SORT_OPTIONS[1];

  useEffect(() => {
    if (!sortMenuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [sortMenuOpen]);

  const fetchPage = useCallback(async (pageIndex: number, append: boolean) => {
    try {
      if (append) setIsLoadingMore(true);
      else setIsLoading(true);

      const currentUser = authService.getCurrentUser();
      const res = await postService.getComments(postId, pageIndex, PAGE_SIZE, currentUser?.id, activeSort.sort);
      const mapped = res.content.map(mapToComment);

      setComments((prev) => (append ? [...prev, ...mapped] : mapped));
      setHasMore(pageIndex + 1 < res.totalPages);
      setTotalElements(res.totalElements);
      if (!append) onCommentsLoaded?.(res.totalElements);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải bình luận');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [postId, onCommentsLoaded, activeSort.sort]);

  useEffect(() => {
    setComments([]);
    setPage(0);
    setHasMore(false);
    void fetchPage(0, false);
  }, [fetchPage]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    void fetchPage(nextPage, true);
  };

  const handleAddComment = async (content: string, imageUrl?: string) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để bình luận');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await postService.addComment(postId, { userId: currentUser.id, content, imageUrl });

      const newComment: Comment = {
        id: response.id,
        postId: response.postId,
        userId: currentUser.id,
        author: {
          name: response.userFullName || currentUser.fullName,
          avatar: response.userAvatarUrl || currentUser.avatarUrl || '',
        },
        content: response.content,
        imageUrl: response.imageUrl ?? null,
        timestamp: 'Vừa xong',
        likeCount: 0,
        isLikedByCurrentUser: false,
        replyCount: 0,
        replies: [],
        isDeleted: false,
        moderationStatus: response.moderationStatus,
      };

      setComments((prev) => [...prev, newComment]);
      if (response.moderationStatus === 'PENDING') {
        toast.info('Bình luận đang chờ kiểm duyệt. Chỉ bạn thấy cho đến khi được duyệt.');
      } else {
        setTotalElements((n) => n + 1);
        onCommentAdded?.();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể gửi bình luận');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setTotalElements((n) => n - 1);
  };

  const handleUpdateComment = (commentId: string, newContent: string) => {
    setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, content: newContent } : c));
  };

  const handleAddReply = async (content: string, parentCommentId: string) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để trả lời');
      return;
    }

    try {
      const response = await postService.addComment(postId, {
        userId: currentUser.id,
        content,
        parentCommentId,
      });

      if (response.moderationStatus === 'PENDING') {
        toast.info('Phản hồi đang chờ kiểm duyệt. Chỉ bạn thấy cho đến khi được duyệt.');
        return;
      }

      // Update replyCount on the parent comment so the button label stays correct
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentCommentId ? { ...c, replyCount: c.replyCount + 1 } : c,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể gửi trả lời');
      throw error;
    }
  };

  return (
    <div className="px-4 py-3">
      {isLoading ? (
        <div className="py-4 text-sm text-muted-foreground">Đang tải bình luận...</div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative mb-3 h-20 w-20">
            <div className="absolute inset-0 rotate-6 rounded-lg bg-muted" />
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-muted">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
          </div>
          <h3 className="mb-1 text-[17px] font-semibold text-foreground">Chưa có bình luận nào</h3>
          <p className="text-[15px] text-muted-foreground">Hãy là người đầu tiên bình luận.</p>
        </div>
      ) : (
        <div className="mb-4 space-y-4">
          {/* Sắp xếp bình luận */}
          <div className="relative inline-block" ref={sortRef}>
            <button
              onClick={() => setSortMenuOpen((o) => !o)}
              className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground dark:hover:text-gray-100 transition-colors cursor-pointer"
            >
              {activeSort.label}
              <ChevronDown className="h-4 w-4" />
            </button>
            {sortMenuOpen && (
              <div className="absolute left-0 top-full z-10 mt-1 w-72 rounded-lg bg-card py-2 shadow-xl ring-1 ring-black/10">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); setSortMenuOpen(false); }}
                    className="flex w-full flex-col items-start px-4 py-2 text-left hover:bg-muted transition-colors cursor-pointer"
                  >
                    <span className={`text-sm font-semibold ${sortBy === opt.value ? 'text-emerald-600' : 'text-foreground'}`}>
                      {opt.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {comments.map((comment) => (
            <div key={comment.id} className="group">
              <CommentItem comment={comment} depth={0} onReply={handleAddReply} onDelete={handleDeleteComment} onUpdate={handleUpdateComment} />
            </div>
          ))}

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="text-sm font-semibold text-muted-foreground hover:underline disabled:opacity-60 cursor-pointer"
            >
              {isLoadingMore
                ? 'Đang tải...'
                : `Xem thêm bình luận (${totalElements - comments.length} còn lại)`}
            </button>
          )}
        </div>
      )}

      <div
        className={`sticky bottom-0 -mx-4 -mb-3 rounded-b-lg border-t border-border bg-card px-4 py-3 ${ isSubmitting ? 'pointer-events-none opacity-70' : '' }`}
      >
        <CommentInput
          onSubmit={handleAddComment}
          enableImage
          userName={authService.getCurrentUser()?.fullName}
          userId={authService.getCurrentUser()?.id}
          userAvatar={authService.getCurrentUser()?.avatarUrl}
          placeholder={`Bình luận dưới tên ${authService.getCurrentUser()?.fullName || 'bạn'}`}
        />
      </div>
    </div>
  );
}
