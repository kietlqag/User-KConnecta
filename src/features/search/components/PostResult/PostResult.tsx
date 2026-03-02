import { Globe, MoreHorizontal } from 'lucide-react';
import { SearchResultPost } from '../../types/search.types';

interface PostResultProps {
  post: SearchResultPost;
}

export const PostResult = ({ post }: PostResultProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Author Avatar */}
        <img
          src={post.author.avatar}
          alt={post.author.name}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />

        {/* Author Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm hover:underline cursor-pointer">
            {post.author.name}
          </h4>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>{post.timestamp}</span>
            <span>•</span>
            <Globe className="w-3 h-3" />
          </div>
        </div>

        {/* More Options */}
        <button className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center flex-shrink-0">
          <MoreHorizontal className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <p className="text-sm text-gray-800 mb-3 line-clamp-3">
        {post.content}
      </p>

      {/* Image (if exists) */}
      {post.image && (
        <div className="rounded-lg overflow-hidden bg-gray-100">
          <img
            src={post.image}
            alt="Post content"
            className="w-full h-auto object-cover"
          />
        </div>
      )}
    </div>
  );
};
