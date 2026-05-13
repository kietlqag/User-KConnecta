import React from 'react';
import {
  MoreHorizontal,
  Bookmark,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface PostMoreMenuProps {
  postId: string;
  isSaved?: boolean;
  isOwner?: boolean;
  onToggleSave?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const PostMoreMenu: React.FC<PostMoreMenuProps> = ({ postId, isSaved = false, isOwner = false, onToggleSave, onDelete, className }) => {
  const handleAction = (action: string) => {
    switch (action) {
      case 'interested':
        toast.success('Đã cập nhật: Bạn sẽ thấy nhiều bài viết tương tự hơn.');
        break;
      case 'not_interested':
        toast.success('Đã cập nhật: Bạn sẽ thấy ít bài viết tương tự hơn.');
        break;
      default:
        break;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer ${className}`}>
          <MoreHorizontal className="w-5 h-5 text-gray-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2">
        <DropdownMenuItem
          className="flex items-start gap-3 p-3 cursor-pointer"
          onClick={() => handleAction('interested')}
        >
          <div className="mt-1">
            <Plus className="w-6 h-6 text-gray-900 border-2 border-gray-900 rounded-full p-0.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[15px]">Quan tâm</span>
            <span className="text-[13px] text-gray-500">Bạn sẽ nhìn thấy nhiều bài viết tương tự hơn.</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="flex items-start gap-3 p-3 cursor-pointer"
          onClick={() => handleAction('not_interested')}
        >
          <div className="mt-1">
            <Minus className="w-6 h-6 text-gray-900 border-2 border-gray-900 rounded-full p-0.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[15px]">Không quan tâm</span>
            <span className="text-[13px] text-gray-500">Bạn sẽ thấy ít bài viết tương tự hơn.</span>
          </div>
        </DropdownMenuItem>

        <div className="my-1 border-t border-gray-100" />

        <DropdownMenuItem
          className="flex items-start gap-3 p-3 cursor-pointer"
          onClick={onToggleSave}
        >
          <div className="mt-1">
            <Bookmark className={`w-6 h-6 ${isSaved ? 'text-blue-600 fill-blue-600' : 'text-gray-900 fill-gray-900'}`} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[15px]">{isSaved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}</span>
            <span className="text-[13px] text-gray-500">
              {isSaved ? 'Xóa khỏi danh sách mục đã lưu.' : 'Thêm vào danh sách mục đã lưu.'}
            </span>
          </div>
        </DropdownMenuItem>

        {isOwner && (
          <>
            <div className="my-1 border-t border-gray-100" />
            <DropdownMenuItem
              className="flex items-start gap-3 p-3 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={onDelete}
            >
              <div className="mt-1">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[15px]">Xóa bài viết</span>
                <span className="text-[13px] text-red-400">Xóa vĩnh viễn bài viết này.</span>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
