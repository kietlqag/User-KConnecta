import { Share2, MoreHorizontal, BookmarkPlus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface SavedItemProps {
  id: string;
  title: string;
  type: string;
  source: string;
  thumbnail: string;
  author: {
    name: string;
    avatar: string;
  };
  savedFrom?: string;
  onUnsave?: (id: string) => void;
}

export const SavedItem = ({
  id,
  title,
  type,
  source,
  thumbnail,
  author,
  savedFrom,
  onUnsave
}: SavedItemProps) => {
  const navigate = useNavigate();

  const handleOpenPost = () => {
    navigate(`/home?post=${id}`);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-4 hover:shadow-sm transition-shadow">
      {/* Thumbnail */}
      <div className="w-48 h-48 rounded-lg overflow-hidden shrink-0 relative bg-gray-100 border border-gray-100 cursor-pointer" onClick={handleOpenPost}>
        <img 
          src={thumbnail} 
          alt={title} 
          className="w-full h-full object-cover"
        />
        {type.toLowerCase() === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 line-clamp-2 mb-1 hover:underline cursor-pointer" onClick={handleOpenPost}>
            {title}
          </h2>
          <div className="text-[13px] text-gray-500 flex items-center gap-1.5 mb-3">
            <span>{type}</span>
            <span>·</span>
            <span className="font-semibold">{source}</span>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <img 
              src={author.avatar} 
              alt={author.name} 
              className="w-6 h-6 rounded-full object-cover"
            />
            <span className="text-[13px] text-gray-600">
              Đã lưu từ <span className="font-semibold text-gray-900 hover:underline cursor-pointer">bài viết của {author.name}</span>
              {savedFrom && <span> trong <span className="font-semibold text-gray-900 hover:underline cursor-pointer">{savedFrom}</span></span>}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-[15px] text-gray-900 transition-colors cursor-pointer">
            <BookmarkPlus className="w-5 h-5" />
            Thêm vào bộ sưu tập
          </button>
          <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer">
            <Share2 className="w-5 h-5 text-gray-700" />
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer">
                <MoreHorizontal className="w-5 h-5 text-gray-700" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600 cursor-pointer flex items-center gap-2"
                onClick={() => onUnsave?.(id)}
              >
                <Trash2 className="w-4 h-4" />
                <span>Bỏ lưu bài viết</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
