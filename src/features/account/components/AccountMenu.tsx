import { Settings, HelpCircle, LogOut, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AUTH_USER_CHANGED_EVENT, authService, type AuthUser } from '@/services/authService';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface AccountMenuProps {
  onClose: () => void;
}

export function AccountMenu({ onClose }: AccountMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
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

  return (
    <div
      ref={menuRef}
      className="absolute top-full right-0 mt-2 w-[360px] bg-popover rounded-xl shadow-2xl border border-border overflow-hidden"
      style={{ maxHeight: 'calc(100vh - 70px)' }}
    >
      <div className="p-2 overflow-y-auto">
        <Link
          to={profileLink}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          onClick={onClose}
        >
          <UserAvatar
            name={fullName}
            avatarUrl={currentUser?.avatarUrl}
            userId={currentUser?.id}
            rounded="full"
            className="w-9 h-9"
          />
          <span className="font-semibold text-gray-900 dark:text-white">{fullName}</span>
        </Link>

        <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

        <div className="space-y-1">
          <button
            onClick={() => { navigate('/settings'); onClose(); }}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
              <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900 dark:text-white">{t('account.settings')}</span>
            <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          </button>

          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900 dark:text-white">Trợ giúp và hỗ trợ</span>
            <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-900 dark:text-white">{t('account.logout')}</span>
          </button>
        </div>
      </div>

      <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <Link to="/privacy" onClick={onClose} className="hover:underline">
            Chính sách bảo mật
          </Link>
          <Link to="/terms" onClick={onClose} className="hover:underline">
            Điều khoản dịch vụ
          </Link>
          <Link to="/contact" onClick={onClose} className="hover:underline">
            Liên hệ
          </Link>
        </div>
      </div>
    </div>
  );
}
