import { Filter, Grid3x3 } from 'lucide-react';
import { Post } from '../../../home/components/Post';

interface ProfilePostsProps {
  posts: Array<{
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
  }>;
}

export function ProfilePosts({ posts }: ProfilePostsProps) {
  return (
    <div>
      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Bài viết</h2>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              <Filter className="w-4 h-4" />
              <span className="font-medium">Bộ lọc</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Grid3x3 className="w-4 h-4" />
              <span className="font-medium">Quản lý bài viết</span>
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mt-4 border-b border-gray-200">
          <button className="flex items-center gap-2 px-4 py-3 text-emerald-600 border-b-4 border-emerald-600 font-medium">
            <span>☰</span>
            Chế độ xem danh sách
          </button>
          <button className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-t-lg transition-colors font-medium">
            <Grid3x3 className="w-4 h-4" />
            Chế độ xem lưới
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Post key={post.id} {...post} />
        ))}
      </div>
    </div>
  );
}
