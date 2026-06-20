import { Settings, HelpCircle, AlertCircle, Moon, LogOut, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AUTH_USER_CHANGED_EVENT, authService, type AuthUser } from '@/services/authService';
import avatarImage from 'figma:asset/34ededad5ccd5d51ad30647ea2c59d1a7ff31f90.png';
import { DisplayAccessibilityPanel } from './DisplayAccessibilityPanel';

interface AccountMenuProps {
  onClose: () => void;
}

export function AccountMenu({ onClose }: AccountMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const [showDisplayPanel, setShowDisplayPanel] = useState(false);

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
        if (showDisplayPanel) {
          setShowDisplayPanel(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, showDisplayPanel]);

  useEffect(() => {
    const syncAuthUser = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener(AUTH_USER_CHANGED_EVENT, syncAuthUser);
    window.addEventListener('storage', syncAuthUser);
    return () => {
      window.removeEventListener(AUTH_USER_CHANGED_EVENT, syncAuthUser);
      window.removeEventListener('storage', syncAuthUser);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      onClose();
      navigate('/auth/login');
    }
  };

  const profileLink = currentUser ? `/profile/${currentUser.username || currentUser.id}` : '/auth/login';
  const fullName = currentUser?.fullName || 'Người dùng';
  const avatarUrl = currentUser?.avatarUrl || avatarImage;

  return (
    <div 
      ref={menuRef}
      className="absolute top-full right-0 mt-2 w-[360px] bg-popover rounded-xl shadow-2xl border border-border overflow-hidden"
      style={{ maxHeight: 'calc(100vh - 70px)' }}
    >
      <div className="p-2 overflow-y-auto">
        {showDisplayPanel ? (
          <DisplayAccessibilityPanel onBack={() => setShowDisplayPanel(false)} />
        ) : (
          <>
        {/* User Profile Section */}
        <Link
          to={profileLink}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          onClick={onClose}
        >
          <img
            src={avatarUrl}
            alt={fullName}
            className="w-9 h-9 rounded-full object-cover"
          />
          <span className="font-semibold text-gray-900 dark:text-white">{fullName}</span>
        </Link>

        <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

        {/* Menu Items */}
        <div className="space-y-1">
          {/* Settings & Privacy */}
          <button
            onClick={() => { navigate('/settings'); onClose(); }}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
              <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900 dark:text-white">Cài đặt và quyền riêng tư</span>
            <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          </button>

          {/* Help & Support */}
          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900 dark:text-white">Trợ giúp và hỗ trợ</span>
            <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          </button>

          {/* Report a Problem */}
          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900 dark:text-white">Report a problem</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">CTRL B</div>
            </div>
          </button>

          {/* Display & Accessibility */}
          <button
            type="button"
            onClick={() => setShowDisplayPanel(true)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
              <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900 dark:text-white">Màn hình và trợ năng</span>
            <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          </button>

          {/* Logout */}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900 dark:text-white">Đăng xuất</span>
          </button>
        </div>
          </>
        )}
      </div>

      {/* Footer Links */}
      {!showDisplayPanel && (
      <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <Link to="/policies" onClick={onClose} className="hover:underline cursor-pointer">
            Chính sách
          </Link>
          {' Â· '}
          <Link to="/settings" onClick={onClose} className="hover:underline cursor-pointer">
            Cài đặt
          </Link>
          {' Â· '}
          <a href="#" className="hover:underline cursor-pointer">Quảng cáo</a>
          {' Â· '}
          <a href="#" className="hover:underline cursor-pointer">Lựa chọn quảng cáo</a>
          {' '}
          <svg className="inline w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 14.5A6.5 6.5 0 1114.5 8 6.508 6.508 0 018 14.5z"/>
          </svg>
          {' Â· '}
          <a href="#" className="hover:underline cursor-pointer">Cookie</a>
          {' Â· '}
          <a href="#" className="hover:underline cursor-pointer">Xem thêm</a>
          {' '}
          <svg className="inline w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
            <path d="M12.5 8l-5-5v10z"/>
          </svg>
        </div>
      </div>
      )}
    </div>
  );
}
