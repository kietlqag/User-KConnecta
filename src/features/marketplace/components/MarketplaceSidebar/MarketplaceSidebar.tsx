import { Search, Plus, Settings, Bell, MessageSquare, ShoppingBag, Tag, MapPin, Car, Home, Wrench, Sofa, Smartphone, Shirt, Gamepad2, BookOpen } from 'lucide-react';

export const MarketplaceSidebar = () => {
  return (
    <div className="w-80 bg-white border-r border-gray-200 h-screen sticky top-14 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Marketplace</h1>
          <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm trên Marketplace"
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm outline-none focus:bg-gray-200 transition-colors"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="py-2">
        <button className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-100 transition-colors">
          <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-gray-700" />
          </div>
          <span className="font-medium">Lướt xem tất cả</span>
        </button>

        <button className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-100 transition-colors">
          <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5 text-gray-700" />
          </div>
          <span className="font-medium">Thông báo</span>
        </button>

        <button className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-100 transition-colors">
          <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-gray-700" />
          </div>
          <span className="font-medium">Hộp thư</span>
        </button>

        <button className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-100 transition-colors">
          <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-gray-700" />
          </div>
          <span className="font-medium">Quyền truy cập Marketplace</span>
        </button>

        <button className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-100 transition-colors">
          <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
            <Tag className="w-5 h-5 text-gray-700" />
          </div>
          <span className="font-medium">Đang mua</span>
        </button>

        <button className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-100 transition-colors">
          <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-gray-700" />
          </div>
          <span className="font-medium">Đang bán</span>
        </button>
      </div>

      {/* Create Listing Button */}
      <div className="px-4 py-2">
        <button className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
          <Plus className="w-5 h-5" />
          Tạo bài niêm yết mới
        </button>
      </div>

      {/* Location Filter */}
      <div className="px-4 py-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold mb-2">Vị trí</h3>
        <button className="w-full text-left text-sm text-blue-500 hover:underline flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Cau Nhiem, Vietnam · Trong vòng 65 km
        </button>
      </div>

      {/* Categories */}
      <div className="px-4 py-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold mb-3">Hạng mục</h3>
        <div className="space-y-1">
          <button className="w-full px-2 py-2 flex items-center gap-3 hover:bg-gray-100 rounded-lg transition-colors">
            <Car className="w-5 h-5 text-gray-600" />
            <span className="text-sm">Xe cộ</span>
          </button>
          <button className="w-full px-2 py-2 flex items-center gap-3 hover:bg-gray-100 rounded-lg transition-colors">
            <Home className="w-5 h-5 text-gray-600" />
            <span className="text-sm">Tài sản cho thuê</span>
          </button>
          <button className="w-full px-2 py-2 flex items-center gap-3 hover:bg-gray-100 rounded-lg transition-colors">
            <Home className="w-5 h-5 text-gray-600" />
            <span className="text-sm">Bán nhà</span>
          </button>
          <button className="w-full px-2 py-2 flex items-center gap-3 hover:bg-gray-100 rounded-lg transition-colors">
            <Wrench className="w-5 h-5 text-gray-600" />
            <span className="text-sm">Dụng cụ sửa chữa nhà cửa</span>
          </button>
          <button className="w-full px-2 py-2 flex items-center gap-3 hover:bg-gray-100 rounded-lg transition-colors">
            <Sofa className="w-5 h-5 text-gray-600" />
            <span className="text-sm">Vật dụng gia đình</span>
          </button>
          <button className="w-full px-2 py-2 flex items-center gap-3 hover:bg-gray-100 rounded-lg transition-colors">
            <Smartphone className="w-5 h-5 text-gray-600" />
            <span className="text-sm">Điện tử</span>
          </button>
          <button className="w-full px-2 py-2 flex items-center gap-3 hover:bg-gray-100 rounded-lg transition-colors">
            <Shirt className="w-5 h-5 text-gray-600" />
            <span className="text-sm">Quần áo & phụ kiện</span>
          </button>
          <button className="w-full px-2 py-2 flex items-center gap-3 hover:bg-gray-100 rounded-lg transition-colors">
            <Gamepad2 className="w-5 h-5 text-gray-600" />
            <span className="text-sm">Đồ chơi & trò chơi</span>
          </button>
          <button className="w-full px-2 py-2 flex items-center gap-3 hover:bg-gray-100 rounded-lg transition-colors">
            <BookOpen className="w-5 h-5 text-gray-600" />
            <span className="text-sm">Sách & tạp chí</span>
          </button>
        </div>
      </div>
    </div>
  );
};
