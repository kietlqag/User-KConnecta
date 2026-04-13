import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { authService } from '@/services/authService';
import { CurrentUserAvatar } from '@/components/shared';
import { LiveDestination, LiveDestinationOption } from '../../types/live.types';

const destinationOptions: LiveDestinationOption[] = [
  {
    id: 'profile',
    label: 'Ðang lên trang cá nhân',
    description: 'Ngu?i t? ch?c - Trang cá nhân c?a b?n',
    icon: '??',
  },
  {
    id: 'page',
    label: 'Ðang lên trang b?n qu?n lý',
    description: 'Chia s? d?n trang c?a b?n',
    icon: '??',
  },
  {
    id: 'group',
    label: 'Ðang trong nhóm',
    description: 'Chia s? trong các nhóm',
    icon: '??',
  },
];

export const LiveSidebar = () => {
  const [selectedDestination, setSelectedDestination] = useState<LiveDestination>('profile');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const currentUser = authService.getCurrentUser();

  const selectedOption = destinationOptions.find((opt) => opt.id === selectedDestination);

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-4">
      <h2 className="text-xl font-bold mb-6">T?o video tr?c ti?p</h2>

      <div className="flex items-center gap-3 mb-6">
        <CurrentUserAvatar />
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{currentUser?.fullName || 'Ngu?i dùng'}</h3>
          <p className="text-xs text-gray-500">Ngu?i t? ch?c - Trang cá nhân c?a b?n</p>
        </div>
      </div>

      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 mb-2 block">Ch?n noi dang</label>
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full px-4 py-3 bg-gray-100 rounded-lg flex items-center justify-between hover:bg-gray-200 transition-colors"
          >
            <span className="text-sm font-medium">{selectedOption?.label}</span>
            <ChevronDown
              className={`w-4 h-4 text-gray-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

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
                  {selectedDestination === option.id && <Check className="w-5 h-5 text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold mb-2 text-blue-900">M?o phát tr?c ti?p</h4>
        <ul className="space-y-2 text-xs text-blue-800">
          <li>- Ki?m tra k?t n?i internet c?a b?n</li>
          <li>- Ð?m b?o ánh sáng d?y d?</li>
          <li>- Chu?n b? n?i dung tru?c khi b?t d?u</li>
          <li>- Tuong tác v?i ngu?i xem</li>
        </ul>
      </div>
    </div>
  );
};

