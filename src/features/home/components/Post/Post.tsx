import { useState } from 'react';
import { MoreHorizontal, ThumbsUp, MessageCircle, Share2, X } from 'lucide-react';
import { ImageWithFallback } from '../../../../components/figma/ImageWithFallback';
import { PostDetailModal } from '../../../../components/posts/PostDetailModal';
import { ReactionButton } from '../../../../components/reactions';

interface PostProps {
  id: string;
  userName: string;
  userAvatar: string;
  timestamp: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked?: boolean;
}

export function Post({
  id, // Added id to destructuring
  userName,
  userAvatar,
  timestamp,
  content,
  image,
  likes,
  comments,
  shares,
  isLiked: initialIsLiked = false,
}: PostProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<any>(null);

  const handleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikeCount(likeCount - 1);
    } else {
      setIsLiked(true);
      setLikeCount(likeCount + 1);
    }
  };

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

  const handleCommentClick = () => {
    setIsModalOpen(true);
  };

  const postData = {
    id,
    author: {
      name: userName,
      avatar: userAvatar,
    },
    content,
    timestamp,
    likes: likeCount,
    comments,
    shares,
    image,
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow mb-4">
        {/* Post Header */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <ImageWithFallback
                src={userAvatar}
                alt={userName}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <h3 className="font-semibold text-gray-900">{userName}</h3>
                <p className="text-sm text-gray-500">{timestamp}</p>
              </div>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Post Content */}
          <p className="text-gray-900 mb-3">{content}</p>
        </div>

        {/* Post Image */}
        {image && (
          <div className="relative bg-black">
            <ImageWithFallback
              src={image}
              alt="Post content"
              className="w-full max-h-[600px] object-contain"
            />
          </div>
        )}

        {/* Post Stats */}
        <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <ThumbsUp className="w-3 h-3 text-white fill-white" />
              </div>
            </div>
            <span>{likeCount}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{comments} bình luận</span>
            <span>{shares} chia sẻ</span>
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
            onClick={handleCommentClick}
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
      </div>

      <PostDetailModal
        post={postData}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}