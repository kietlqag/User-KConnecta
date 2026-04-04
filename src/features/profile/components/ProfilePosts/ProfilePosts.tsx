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
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bài viết</h2>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
              <Filter className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              <span className="font-medium text-gray-900 dark:text-white">Bộ lọc</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
              <Grid3x3 className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              <span className="font-medium text-gray-900 dark:text-white">Quản lý bài viết</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2">
          <button className="flex items-center justify-center gap-2 px-4 py-3 text-emerald-600 dark:text-emerald-400 border-b-4 border-emerald-600 dark:border-emerald-400 font-medium bg-emerald-50/50 dark:bg-emerald-950/20">
            <span>☰</span>
            Chế độ xem danh sách
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium">
            <Grid3x3 className="w-4 h-4" />
            Chế độ xem lưới
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <Post key={post.id} {...post} />
        ))}
      </div>
    </div>
  );
}
