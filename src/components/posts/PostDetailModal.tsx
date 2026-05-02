import { useCallback, useEffect, useState } from 'react';
import { X, ThumbsUp, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';
import {
  getActiveReactions,
  getTotalReactionCount,
  type ReactionCountMap,
} from '@/components/reactions';
import { CommentSection } from './CommentSection';

interface Post {
  id: string;
  author: {
    name: string;
    avatar: string;
    status?: string;
  };
  content: string;
  timestamp: string;
  likes?: number;
  comments?: number;
  shares?: number;
  image?: string;
  media?: { type: 'image' | 'video'; url: string };
  reactionCounts?: ReactionCountMap;
}

interface PostDetailModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
  onCommentCountChange?: (count: number) => void;
  onShareAdded?: () => void;
}

export function PostDetailModal({
  post,
  isOpen,
  onClose,
  onCommentAdded,
  onCommentCountChange,
  onShareAdded,
}: PostDetailModalProps) {
  const [commentCount, setCommentCount] = useState(post.comments || 0);
  const [shareCount, setShareCount] = useState(post.shares || 0);
  const [isSharing, setIsSharing] = useState(false);

  const reactionCounts = post.reactionCounts || {
    LIKE: post.likes || 0,
    LOVE: 0,
    HAHA: 0,
    WOW: 0,
    SAD: 0,
    ANGRY: 0,
  };
  const activeReactions = getActiveReactions(reactionCounts);
  const totalReactionCount = getTotalReactionCount(reactionCounts);

  useEffect(() => {
    setCommentCount(post.comments || 0);
    setShareCount(post.shares || 0);
  }, [post.comments, post.shares, post.id]);

  const handleShare = async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để chia sẻ');
      return;
    }

    try {
      setIsSharing(true);
      await postService.sharePost(post.id, { userId: currentUser.id });
      setShareCount((prev) => prev + 1);
      onShareAdded?.();
      toast.success('Đã chia sẻ bài viết');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể chia sẻ bài viết');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCommentAdded = useCallback(() => {
    setCommentCount((prev) => {
      const nextCount = prev + 1;
      onCommentCountChange?.(nextCount);
      return nextCount;
    });
    onCommentAdded?.();
  }, [onCommentAdded, onCommentCountChange]);

  const handleCommentsLoaded = useCallback((count: number) => {
    setCommentCount(count);
    onCommentCountChange?.(count);
  }, [onCommentCountChange]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-semibold">Bài viết của {post.author.name}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 transition-colors hover:bg-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pb-3 pt-4">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold">{post.author.name}</h3>
                    {post.author.status && (
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs text-gray-600">{post.author.status}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>{post.timestamp}</span>
                    <span>·</span>
                    <span>🌐</span>
                  </div>
                </div>
              </div>
              <button className="rounded-full p-2 transition-colors hover:bg-gray-100">
                <MoreHorizontal className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="px-4 pb-3">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{post.content}</p>
          </div>

          {post.media ? (
            <div className="mb-3 bg-black flex justify-center">
              {post.media.type === 'video' ? (
                <video src={post.media.url} controls className="w-full max-h-[500px] object-contain" />
              ) : (
                <img src={post.media.url} alt="Post content" className="w-full max-h-[500px] object-contain" />
              )}
            </div>
          ) : post.image ? (
            <div className="mb-3 bg-black flex justify-center">
              <img src={post.image} alt="Post content" className="w-full max-h-[500px] object-contain" />
            </div>
          ) : null}

          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              {totalReactionCount > 0 && (
                <>
                  <div className="flex items-center -space-x-1">
                    {activeReactions.slice(0, 3).map((reaction) => (
                      <span
                        key={reaction.type}
                        className="flex h-4 w-4 items-center justify-center rounded-full border border-white bg-white text-sm leading-none"
                      >
                        {reaction.emoji}
                      </span>
                    ))}
                  </div>
                  <span className="ml-1">{totalReactionCount}</span>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <span>{commentCount} bình luận</span>
              <span>{shareCount} chia sẻ</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 border-b border-gray-200 px-4 py-1">
            <button className="flex items-center justify-center gap-2 rounded-md py-2 transition-colors hover:bg-gray-100">
              <ThumbsUp className="h-5 w-5 text-gray-600" />
              <span className="text-[15px] font-semibold text-gray-600">Thích</span>
            </button>
            <button className="flex items-center justify-center gap-2 rounded-md py-2 transition-colors hover:bg-gray-100">
              <MessageCircle className="h-5 w-5 text-gray-600" />
              <span className="text-[15px] font-semibold text-gray-600">Bình luận</span>
            </button>
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="flex items-center justify-center gap-2 rounded-md py-2 transition-colors hover:bg-gray-100 disabled:opacity-60"
            >
              <Share2 className="h-5 w-5 text-gray-600" />
              <span className="text-[15px] font-semibold text-gray-600">
                {isSharing ? 'Đang chia sẻ...' : 'Chia sẻ'}
              </span>
            </button>
          </div>

          <CommentSection
            postId={post.id}
            onCommentAdded={handleCommentAdded}
            onCommentsLoaded={handleCommentsLoaded}
          />
        </div>
      </div>
    </div>
  );
}
