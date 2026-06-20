import * as React from 'react';
import { ThumbsUp } from 'lucide-react';

const LIKE_CATEGORIES = [
  { id: 'all',    label: 'Tất cả' },
  { id: 'movies', label: 'Phim' },
  { id: 'tv',     label: 'Chương trình TV' },
  { id: 'music',  label: 'Âm nhạc' },
  { id: 'books',  label: 'Sách' },
  { id: 'sports', label: 'Thể thao' },
  { id: 'games',  label: 'Trò chơi' },
];

export function ProfileLikesPage() {
  const [activeTab, setActiveTab] = React.useState('all');

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-700 overflow-hidden">

        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <ThumbsUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Thích</h2>
        </div>

        <div className="flex items-center gap-1 px-3 overflow-x-auto scrollbar-none border-b border-gray-200 dark:border-gray-700">
          {LIKE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                activeTab === cat.id
                  ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 border-transparent hover:bg-muted rounded-t-lg'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="relative mb-4 h-20 w-20">
            <div className="absolute inset-0 rotate-6 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <ThumbsUp className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">Chưa có lượt thích nào</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Các trang và nội dung bạn thích sẽ xuất hiện ở đây.
          </p>
        </div>
      </div>
    </div>
  );
}
