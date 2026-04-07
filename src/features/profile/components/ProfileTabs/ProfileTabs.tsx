import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, MoreHorizontal, Lock, Settings, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authService } from '@/services/authService';
import { ChangePasswordDialog } from '@/features/auth/components';

interface ProfileTabsProps {
  userId: string;
  isOwnProfile?: boolean;
}

export function ProfileTabs({ userId, isOwnProfile: isOwnProfileProp }: ProfileTabsProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const currentUser = authService.getCurrentUser();
  const isOwnProfile = isOwnProfileProp ?? currentUser?.id === userId;
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);

  const tabs = [
    { label: 'Tất cả', path: `/profile/${userId}` },
    { label: 'Giới thiệu', path: `/profile/${userId}/about` },
    { label: 'Bạn bè', path: `/profile/${userId}/friends` },
    { label: 'Ảnh', path: `/profile/${userId}/photos` },
    { label: 'Reels', path: `/profile/${userId}/reels` },
  ];

  const moreTabs = [
    { label: 'Thích', path: `/profile/${userId}/likes` },
    { label: 'Clip', path: `/profile/${userId}/clips` },
    { label: 'Sự kiện', path: `/profile/${userId}/events` },
    { label: 'Câu hỏi', path: `/profile/${userId}/questions` },
  ];

  const isActive = (path: string) => {
    if (path === `/profile/${userId}`) {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className="sticky top-14 z-40 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="mx-auto max-w-[1100px] px-4">
        <div className="flex items-center justify-between">
          <nav className="-mb-px flex items-center gap-2 overflow-x-auto scrollbar-none">
            {tabs.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={`whitespace-nowrap px-4 py-4 font-medium transition-colors ${
                  isActive(tab.path)
                    ? 'border-b-4 border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                    : 'rounded-t-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-1 whitespace-nowrap px-4 py-4 font-medium transition-colors outline-none ${
                    moreTabs.some((tab) => isActive(tab.path))
                      ? 'border-b-4 border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                      : 'rounded-t-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  Xem thêm
                  <ChevronDown className="h-4 w-4" />
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
              <button className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                <MoreHorizontal className="h-6 w-6 text-gray-600 dark:text-gray-400" />
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

      <ChangePasswordDialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen} />
    </div>
  );
}
