import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, MoreHorizontal, Lock, Settings, LogOut } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { authService } from '@/services/authService';
import { ChangePasswordDialog } from '@/features/auth/components';

interface ProfileTabsProps {
  username: string;
  isOwnProfile?: boolean;
}

export function ProfileTabs({ username, isOwnProfile: isOwnProfileProp }: ProfileTabsProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const currentUser = authService.getCurrentUser();
  
  const isOwnProfile = isOwnProfileProp ?? (
    currentUser?.username?.toLowerCase() === username?.toLowerCase() || 
    currentUser?.id === username
  );
  
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);

  const tabs = [
    { label: 'Tất cả', path: `/profile/${username}` },
    { label: 'Giới thiệu', path: `/profile/${username}/about` },
    { label: 'Bạn bè', path: `/profile/${username}/friends` },
    { label: 'Ảnh', path: `/profile/${username}/photos` },
    { label: 'Reels', path: `/profile/${username}/reels` },
  ];

  const moreTabs = [
    { label: 'Thích', path: `/profile/${username}/likes` },
    { label: 'Clip', path: `/profile/${username}/clips` },
    { label: 'Sự kiện', path: `/profile/${username}/events` },
    { label: 'Câu hỏi', path: `/profile/${username}/questions` },
  ];

  const isActive = (path: string) => {
    if (path === `/profile/${username}`) {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-14 z-40">
      <div className="max-w-[1100px] mx-auto px-4">
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-2 -mb-px overflow-x-auto scrollbar-none">
            {tabs.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={`px-4 py-4 font-medium transition-colors whitespace-nowrap ${
                  isActive(tab.path)
                    ? 'text-emerald-600 dark:text-emerald-400 border-b-4 border-emerald-600 dark:border-emerald-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg'
                }`}
              >
                {tab.label}
              </Link>
            ))}

            {/* More Dropdown Tab */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-1 px-4 py-4 font-medium transition-colors whitespace-nowrap outline-none ${
                    moreTabs.some(tab => isActive(tab.path))
                      ? 'text-emerald-600 dark:text-emerald-400 border-b-4 border-emerald-600 dark:border-emerald-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg'
                  }`}
                >
                  Xem thêm
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {moreTabs.map((tab) => (
                  <DropdownMenuItem key={tab.path} asChild>
                    <Link to={tab.path} className="w-full cursor-pointer">
                      {tab.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0">
                <MoreHorizontal className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {isOwnProfile && (
                <>
                  <DropdownMenuItem onClick={() => setIsPasswordDialogOpen(true)}>
                    <Lock className="mr-2 h-4 w-4" />
                    <span>Đổi mật khẩu</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Cài đặt</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 dark:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ChangePasswordDialog 
        open={isPasswordDialogOpen} 
        onOpenChange={setIsPasswordDialogOpen} 
      />
    </div>
  );
}