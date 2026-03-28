import { Settings, HelpCircle, AlertCircle, Moon, LogOut, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router@7.1.3';
import avatarImage from 'figma:asset/34ededad5ccd5d51ad30647ea2c59d1a7ff31f90.png';

interface AccountMenuProps {
  onClose: () => void;
}

export function AccountMenu({ onClose }: AccountMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        // Don't close if clicking the avatar button
        if (!target.closest('[data-account-toggle]')) {
          onClose();
        }
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleLogout = () => {
    // Handle logout logic here
    console.log('Logging out...');
    onClose();
  };

  return (
    <div 
      ref={menuRef}
      className="absolute top-full right-0 mt-2 w-[360px] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
      style={{ maxHeight: 'calc(100vh - 70px)' }}
    >
      <div className="p-2 overflow-y-auto">
        {/* User Profile Section */}
        <Link
          to="/profile"
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          onClick={onClose}
        >
          <img
            src={avatarImage}
            alt="Khang Nguyen"
            className="w-9 h-9 rounded-full object-cover"
          />
          <span className="font-semibold text-gray-900">Khang Nguyen</span>
        </Link>

        {/* View All Profiles Button */}
        <button className="w-full mt-2 mb-2 p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer">
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="font-medium text-gray-900">Xem tất cả trang cá nhân</span>
        </button>

        <div className="border-t border-gray-200 my-2" />

        {/* Menu Items */}
        <div className="space-y-1">
          {/* Settings & Privacy */}
          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <Settings className="w-5 h-5 text-gray-700" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900">Cài đặt và quyền riêng tư</span>
            <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
          </button>

          {/* Help & Support */}
          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-5 h-5 text-gray-700" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900">Trợ giúp và hỗ trợ</span>
            <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
          </button>

          {/* Report a Problem */}
          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-gray-700" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900">Report a problem</div>
              <div className="text-xs text-gray-500">CTRL B</div>
            </div>
          </button>

          {/* Display & Accessibility */}
          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <Moon className="w-5 h-5 text-gray-700" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900">Màn hình và trợ năng</span>
            <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
          </button>

          {/* Logout */}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5 text-gray-700" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900">Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Footer Links */}
      <div className="px-4 py-3 bg-white border-t border-gray-200">
        <div className="text-xs text-gray-500 leading-relaxed">
          <a href="#" className="hover:underline cursor-pointer">Quyền riêng tư</a>
          {' · '}
          <a href="#" className="hover:underline cursor-pointer">Điều khoản</a>
          {' · '}
          <a href="#" className="hover:underline cursor-pointer">Quảng cáo</a>
          {' · '}
          <a href="#" className="hover:underline cursor-pointer">Lựa chọn quảng cáo</a>
          {' '}
          <svg className="inline w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 14.5A6.5 6.5 0 1114.5 8 6.508 6.508 0 018 14.5z"/>
          </svg>
          {' · '}
          <a href="#" className="hover:underline cursor-pointer">Cookie</a>
          {' · '}
          <a href="#" className="hover:underline cursor-pointer">Xem thêm</a>
          {' '}
          <svg className="inline w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.5 8l-5-5v10z"/>
          </svg>
        </div>
      </div>
    </div>
  );
}