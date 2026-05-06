import React from 'react';
import { 
  Settings, 
  Bookmark, 
  Plus, 
  Lock, 
  MoreHorizontal 
} from 'lucide-react';

interface SavedSidebarProps {
  activeCollection?: string;
}

export const SavedSidebar = ({ activeCollection = 'all' }: SavedSidebarProps) => {
  return (
    <aside className="w-[360px] h-[calc(100vh-56px)] bg-white border-r border-gray-200 flex flex-col fixed left-0 top-14 z-20">
      <div className="p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Đã lưu</h1>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left group ${activeCollection === 'all' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${activeCollection === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
            <Bookmark className="w-5 h-5" />
          </div>
          <span className="font-semibold text-[15px]">Mục đã lưu</span>
        </button>

        <div className="mt-4 px-3 mb-2">
          <h3 className="text-[17px] font-bold text-gray-900">Bộ sưu tập của tôi</h3>
        </div>

        <div className="space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left group relative">
            <div className="w-9 h-9 rounded-lg bg-gray-200 overflow-hidden shrink-0">
              <img 
                src="https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=100&h=100&fit=crop" 
                alt="Watch later" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-[15px] text-gray-900">Để xem sau</span>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Lock className="w-3 h-3" />
                <span>Chỉ mình tôi</span>
              </div>
            </div>
          </button>
        </div>

        <button className="mt-4 w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-left">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <span className="font-semibold text-[15px]">Tạo bộ sưu tập mới</span>
        </button>
      </div>
    </aside>
  );
};
