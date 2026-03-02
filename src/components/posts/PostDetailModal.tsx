import { X, ThumbsUp, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
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
}

interface PostDetailModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
}

export function PostDetailModal({ post, isOpen, onClose }: PostDetailModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-lg">Bài viết của {post.author.name}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Post Header */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[15px]">{post.author.name}</h3>
                    {post.author.status && (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        <span className="text-xs text-gray-600">{post.author.status}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <span>{post.timestamp}</span>
                    <span>·</span>
                    <span>🌐</span>
                  </div>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <MoreHorizontal className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Post Content */}
          <div className="px-4 pb-3">
            <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{post.content}</p>
          </div>

          {/* Post Image if exists */}
          {post.image && (
            <div className="mb-3">
              <img
                src={post.image}
                alt="Post content"
                className="w-full object-cover"
              />
            </div>
          )}

          {/* Reactions Count */}
          <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-600 border-b border-gray-200">
            <div className="flex items-center gap-1">
              <div className="flex items-center -space-x-1">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                  <ThumbsUp className="w-3 h-3 text-white fill-white" />
                </div>
              </div>
              <span className="ml-1">{post.likes || 0}</span>
            </div>
            <div className="flex gap-3">
              <span>{post.comments || 0} bình luận</span>
              <span>{post.shares || 0} chia sẻ</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 py-1 border-b border-gray-200 grid grid-cols-3 gap-1">
            <button className="flex items-center justify-center gap-2 py-2 rounded-md hover:bg-gray-100 transition-colors">
              <ThumbsUp className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-600 text-[15px]">Thích</span>
            </button>
            <button className="flex items-center justify-center gap-2 py-2 rounded-md hover:bg-gray-100 transition-colors">
              <MessageCircle className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-600 text-[15px]">Bình luận</span>
            </button>
            <button className="flex items-center justify-center gap-2 py-2 rounded-md hover:bg-gray-100 transition-colors">
              <Share2 className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-600 text-[15px]">Chia sẻ</span>
            </button>
          </div>

          {/* Comments Section */}
          <CommentSection postId={post.id} />
        </div>
      </div>
    </div>
  );
}
