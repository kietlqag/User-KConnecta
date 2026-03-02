import { useState } from 'react';
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { GroupPost } from '../../types/groups.types';

interface GroupPostCardProps {
  post: GroupPost;
}

export const GroupPostCard = ({ post }: GroupPostCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const totalReactions = post.reactions.like + post.reactions.love + post.reactions.haha;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
      {/* Post Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h3 className="font-semibold text-gray-900 hover:underline cursor-pointer">
                {post.author.name}
              </h3>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span className="hover:underline cursor-pointer font-medium text-gray-700">
                  {post.group.name}
                </span>
                <span>·</span>
                <span>{post.timestamp}</span>
              </div>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreHorizontal className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Post Content */}
        <p className="text-gray-900 mb-3 whitespace-pre-wrap">{post.content}</p>

        {/* Media */}
        {post.media && (
          <div className="rounded-lg overflow-hidden -mx-4">
            {post.media.type === 'image' ? (
              <img
                src={post.media.url}
                alt="Post media"
                className="w-full object-cover max-h-[500px]"
              />
            ) : (
              <video
                src={post.media.url}
                controls
                className="w-full object-cover max-h-[500px]"
              />
            )}
          </div>
        )}
      </div>

      {/* Reactions Summary */}
      {totalReactions > 0 && (
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <div className="flex items-center">
                <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                  👍
                </span>
              </div>
              <span className="hover:underline cursor-pointer">
                {totalReactions} {totalReactions === 1 ? 'lượt thích' : 'lượt thích'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {post.commentsCount > 0 && (
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="hover:underline"
                >
                  {post.commentsCount} bình luận
                </button>
              )}
              {post.sharesCount > 0 && (
                <span className="hover:underline cursor-pointer">
                  {post.sharesCount} lượt chia sẻ
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="border-t border-gray-200 px-4 py-1">
        <div className="flex items-center justify-around">
          <button className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <ThumbsUp className="w-5 h-5" />
            <span className="font-medium">Thích</span>
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Bình luận</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Share2 className="w-5 h-5" />
            <span className="font-medium">Chia sẻ</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && post.comments && post.comments.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3">
          <div className="space-y-3">
            {post.comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <img
                  src={comment.author.avatar}
                  alt={comment.author.name}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-2xl px-3 py-2">
                    <h4 className="font-semibold text-sm text-gray-900 hover:underline cursor-pointer">
                      {comment.author.name}
                    </h4>
                    <p className="text-sm text-gray-900">{comment.content}</p>
                  </div>
                  <div className="flex items-center gap-3 px-3 mt-1">
                    <button className="text-xs font-semibold text-gray-600 hover:underline">
                      Thích
                    </button>
                    <button className="text-xs font-semibold text-gray-600 hover:underline">
                      Trả lời
                    </button>
                    <span className="text-xs text-gray-500">{comment.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Write Comment */}
          <div className="flex items-center gap-2 mt-3">
            <img
              src={post.author.avatar}
              alt="Your avatar"
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Viết bình luận..."
                className="w-full px-4 py-2 bg-gray-100 rounded-full outline-none focus:bg-gray-200 transition-colors"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
