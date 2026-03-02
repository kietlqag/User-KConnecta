import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { LiveDestination, LiveDestinationOption } from '../../types/live.types';

const destinationOptions: LiveDestinationOption[] = [
  {
    id: 'profile',
    label: 'Đăng lên trang cá nhân',
    description: 'Người tổ chức - Trang cá nhân của bạn',
    icon: '👤',
  },
  {
    id: 'page',
    label: 'Đăng lên trang bạn quản lý',
    description: 'Chia sẻ đến trang của bạn',
    icon: '📄',
  },
  {
    id: 'group',
    label: 'Đăng trong nhóm',
    description: 'Chia sẻ trong các nhóm',
    icon: '👥',
  },
];

export const LiveSidebar = () => {
  const [selectedDestination, setSelectedDestination] = useState<LiveDestination>('profile');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedOption = destinationOptions.find(opt => opt.id === selectedDestination);

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-4">
      {/* Header */}
      <h2 className="text-xl font-bold mb-6">Tạo video trực tiếp</h2>

      {/* User Info */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <span className="text-sm font-semibold text-white">QK</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Khang Nguyen</h3>
          <p className="text-xs text-gray-500">Người tổ chức - Trang cá nhân của bạn</p>
        </div>
      </div>

      {/* Destination Dropdown */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Chọn nơi đăng
        </label>
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full px-4 py-3 bg-gray-100 rounded-lg flex items-center justify-between hover:bg-gray-200 transition-colors"
          >
            <span className="text-sm font-medium">{selectedOption?.label}</span>
            <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
              {destinationOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setSelectedDestination(option.id);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                    {option.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                  {selectedDestination === option.id && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold mb-2 text-blue-900">Mẹo phát trực tiếp</h4>
        <ul className="space-y-2 text-xs text-blue-800">
          <li>• Kiểm tra kết nối internet của bạn</li>
          <li>• Đảm bảo ánh sáng đầy đủ</li>
          <li>• Chuẩn bị nội dung trước khi bắt đầu</li>
          <li>• Tương tác với người xem</li>
        </ul>
      </div>
    </div>
  );
};
