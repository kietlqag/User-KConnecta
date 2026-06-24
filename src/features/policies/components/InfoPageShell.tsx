import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import logoV2 from '@/assets/LogoKConnecta_V2.png';
import { Header } from '@/features/home/components/Header/Header';
import { authService } from '@/services/authService';

interface InfoPageShellProps {
  title: string;
  subtitle: string;
  updatedAt?: string;
  icon: LucideIcon;
  children: ReactNode;
}

export function InfoPageShell({ title, subtitle, updatedAt, icon: Icon, children }: InfoPageShellProps) {
  const isLoggedIn = !!authService.getCurrentUser();
  const backHref = isLoggedIn ? '/home' : '/auth/login';
  const backLabel = isLoggedIn ? 'Về trang chủ' : 'Quay lại đăng nhập';

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-background">
      <Header />
      <div className="w-full px-4 pb-12 pt-20 sm:px-6 lg:px-8">
        <Link
          to={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <header className="mt-6 border-b border-gray-200 pb-6 dark:border-gray-700">
          <div className="flex items-start gap-4">
            <img src={logoV2} alt="KConnecta" className="h-12 w-12 shrink-0 object-contain" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">KConnecta</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">{title}</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
              {updatedAt && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">Cập nhật lần cuối: {updatedAt}</p>
              )}
            </div>
          </div>
        </header>

        {children}

        <p className="mt-10 text-xs text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} KConnecta. Mọi quyền được bảo lưu.
        </p>
      </div>
    </div>
  );
}
