import { vi } from '@/constants/vi';
import { Settings, HelpCircle, LogOut, ChevronRight, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AUTH_USER_CHANGED_EVENT, authService, type AuthUser } from '@/services/authService';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface AccountMenuProps {
  onClose: () => void;
}

export function AccountMenu({ onClose }: AccountMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const [loggingOut, setLoggingOut] = useState(false);

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
    if (loggingOut) return;
    setLoggingOut(true);
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
          <span className="font-semibold text-foreground">{fullName}</span>
        </Link>

        <div className="border-t border-border my-2" />

        <div className="space-y-1">
          <button
            onClick={() => { navigate('/settings'); onClose(); }}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
              <Settings className="w-5 h-5 text-foreground" />
            </div>
            <span className="flex-1 text-left font-medium text-foreground">{vi.account.settings}</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </button>

          <button
            onClick={() => { navigate('/support'); onClose(); }}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-5 h-5 text-foreground" />
            </div>
            <span className="flex-1 text-left font-medium text-foreground">Trợ giúp và hỗ trợ</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
              {loggingOut ? (
                <Loader2 className="w-5 h-5 text-foreground animate-spin" />
              ) : (
                <LogOut className="w-5 h-5 text-foreground" />
              )}
            </div>
            <span className="flex-1 text-left font-medium text-foreground">
              {loggingOut ? 'Đang đăng xuất...' : vi.account.logout}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
