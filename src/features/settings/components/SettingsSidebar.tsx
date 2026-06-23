import { Shield, ShieldCheck, Palette, Bell } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import type { SettingsTab } from '../types/userSettings.types';

const NAV_ITEMS: {
  id: SettingsTab;
  label: string;
  icon: typeof Shield;
}[] = [
  { id: 'security', label: 'Bảo mật tài khoản', icon: Shield },
  { id: 'privacy', label: 'Quyền riêng tư', icon: ShieldCheck },
  { id: 'notifications', label: 'Thông báo', icon: Bell },
  { id: 'appearance', label: 'Giao diện', icon: Palette },
];

interface SettingsSidebarProps {
  active: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
  className?: string;
}

export function SettingsSidebar({ active, onSelect, className }: SettingsSidebarProps) {
  return (
    <nav className={cn('flex flex-col', className)} aria-label="Cài đặt">
      <div className="mb-6 hidden lg:block">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Cài đặt</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quản lý tài khoản và trải nghiệm KConnecta</p>
      </div>

      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors',
                  isActive
                    ? 'bg-accent text-primary font-semibold'
                    : 'text-foreground hover:bg-muted/60',
                )}
              >
                <Icon
                  className={cn('h-5 w-5 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')}
                  aria-hidden
                />
                <span className="text-sm">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SettingsMobileNav({ active, onSelect }: SettingsSidebarProps) {
  return (
    <div className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-[10px] border px-3 py-2 text-sm transition-colors',
              isActive
                ? 'border-primary/30 bg-accent font-medium text-primary'
                : 'border-border bg-card text-foreground hover:bg-muted/50',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export const SETTINGS_TAB_LABELS: Record<SettingsTab, string> = {
  security: 'Bảo mật tài khoản',
  privacy: 'Quyền riêng tư',
  notifications: 'Thông báo',
  appearance: 'Giao diện',
};
