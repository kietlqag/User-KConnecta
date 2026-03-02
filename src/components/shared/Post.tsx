import { useState } from 'react';
import { MoreHorizontal, MessageCircle, Share2 } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { ReactionButton } from '../reactions';

interface Author {
  id: string;
  name: string;
  avatar: string;
}

interface Group {
  id: string;
  name: string;
  icon?: string;
}

interface Media {
  type: 'image' | 'video';
  url: string;
}

interface Comment {
  id: string;
  author: Author;
  content: string;
  timestamp: string;
  reactions: number;
}

export interface PostProps {
  id: string;
  author: Author;
  timestamp: string;
  content: string;
  image?: string;
  media?: Media;
  likes: number;
  comments: number;
  shares: number;
  isLiked?: boolean;
  group?: Group;
  commentsData?: Comment[];
  onCommentClick?: () => void;
}

export function Post({
  id,
  author,
  timestamp,
  content,
  image,
  media,
  likes,
  comments,
  shares,
  isLiked: initialIsLiked = false,
  group,
  commentsData,
  onCommentClick,
}: PostProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [selectedReaction, setSelectedReaction] = useState<any>(null);
  const [showComments, setShowComments] = useState(false);

  const handleReactionChange = (reaction: any) => {
    setSelectedReaction(reaction);
    if (reaction && !isLiked) {
      setIsLiked(true);
      setLikeCount(likeCount + 1);
    } else if (!reaction && isLiked) {
      setIsLiked(false);
      setLikeCount(likeCount - 1);
    }
  };

  const handleCommentButtonClick = () => {
    if (onCommentClick) {
      onCommentClick();
    } else {
      setShowComments(!showComments);
    }
  };

  const mediaUrl = media?.url || image;
  const mediaType = media?.type || 'image';

  return (
    <div className="bg-white rounded-lg shadow mb-4">
      {/* Post Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <ImageWithFallback
              src={author.avatar}
              alt={author.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h3 className="font-semibold text-gray-900 hover:underline cursor-pointer">
                {author.name}
              </h3>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                {group && (
                  <>
                    <span className="hover:underline cursor-pointer font-medium text-gray-700">
                      {group.name}
                    </span>
                    <span>·</span>
                  </>
                )}
                <span>{timestamp}</span>
              </div>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreHorizontal className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Post Content */}
        <p className="text-gray-900 mb-3 whitespace-pre-wrap">{content}</p>
      </div>

      {/* Post Media */}
      {mediaUrl && (
        <div className="relative bg-black">
          {mediaType === 'image' ? (
            <ImageWithFallback
              src={mediaUrl}
              alt="Post content"
              className="w-full max-h-[600px] object-contain"
            />
          ) : (
            <video
              src={mediaUrl}
              controls
              className="w-full max-h-[600px] object-contain"
            />
          )}
        </div>
      )}

      {/* Post Stats */}
      <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          {likeCount > 0 && (
            <>
              <div className="flex items-center">
                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">👍</span>
                </div>
              </div>
              <span>{likeCount}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {comments > 0 && <span>{comments} bình luận</span>}
          {shares > 0 && <span>{shares} chia sẻ</span>}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-300 mx-4" />

      {/* Post Actions */}
      <div className="px-4 py-2 flex items-center justify-around">
        <ReactionButton
          initialReaction={selectedReaction}
          onReactionChange={handleReactionChange}
        />

        <button
          onClick={handleCommentButtonClick}
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex-1 justify-center text-gray-600"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium">Bình luận</span>
        </button>

        <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex-1 justify-center text-gray-600">
          <Share2 className="w-5 h-5" />
          <span className="font-medium">Chia sẻ</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && commentsData && commentsData.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3">
          <div className="space-y-3">
            {commentsData.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <ImageWithFallback
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
            <ImageWithFallback
              src={author.avatar}
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
}
