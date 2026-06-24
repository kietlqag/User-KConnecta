import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { MainLayout } from '@/layouts';
import { PostDetailModal } from '@/components/posts/PostDetailModal';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';
import { mapApiPost, type FeedPost } from '@/utils/postUtils';
import type { ReactionOption } from '@/components/reactions';

export function PostPermalinkPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const currentUser = useMemo(() => authService.getCurrentUser(), []);
  const [post, setPost] = useState<FeedPost | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<ReactionOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) {
      setError('Liên kết bài viết không hợp lệ.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    postService.getPostById(postId, currentUser?.id)
      .then((data) => {
        if (cancelled) return;
        const mappedPost = mapApiPost(data);
        setPost(mappedPost);
        setSelectedReaction(data.currentUserReactionType
          ? {
              type: data.currentUserReactionType,
              label: data.currentUserReactionType,
              emoji: '',
            }
          : null);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Không tìm thấy bài viết hoặc bạn không có quyền xem bài viết này.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, postId]);

  const handleClose = useCallback(() => {
    navigate('/home');
  }, [navigate]);

  const handleCommentCountChange = useCallback((count: number) => {
    setPost((prev) => prev ? { ...prev, comments: count } : prev);
  }, []);

  const handleShareAdded = useCallback((count: number) => {
    setPost((prev) => prev ? { ...prev, shares: count } : prev);
  }, []);

  return (
    <MainLayout>
      <main className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-3xl items-center justify-center px-4 py-8">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Đang mở bài viết...</span>
          </div>
        ) : error ? (
          <div className="w-full rounded-lg bg-white dark:bg-gray-800 p-6 text-center shadow-sm dark:shadow-none">
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{error}</p>
            <Link
              to="/home"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Về trang chủ
            </Link>
          </div>
        ) : post ? (
          <PostDetailModal
            post={{
              ...post,
              isOwner: currentUser?.id === post.author.id,
              currentUserId: currentUser?.id,
            }}
            isOpen
            onClose={handleClose}
            onCommentCountChange={handleCommentCountChange}
            onShareAdded={handleShareAdded}
            selectedReaction={selectedReaction}
            onReactionChange={setSelectedReaction}
            originalPostId={post.sharedPost && post.originalPost ? post.originalPost.id : post.id}
            parentShareId={post.sharedPost ? post.id : undefined}
          />
        ) : null}
      </main>
    </MainLayout>
  );
}
