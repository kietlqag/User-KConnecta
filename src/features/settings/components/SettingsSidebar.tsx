import { Shield, ShieldCheck, Palette, Bell, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/components/ui/utils';
import type { SettingsTab } from '../types/userSettings.types';

const NAV_ITEM_IDS: { id: SettingsTab; icon: typeof Shield }[] = [
  { id: 'security', icon: Shield },
  { id: 'privacy', icon: ShieldCheck },
  { id: 'notifications', icon: Bell },
  { id: 'appearance', icon: Palette },
  { id: 'reminders', icon: Timer },
];

interface SettingsSidebarProps {
  active: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
  className?: string;
}

export function SettingsSidebar({ active, onSelect, className }: SettingsSidebarProps) {
  const { t } = useTranslation();

  return (
    <nav className={cn('flex flex-col', className)} aria-label={t('settings.title')}>
      <div className="mb-6 hidden lg:block">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <ul className="space-y-1">
        {NAV_ITEM_IDS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn( 'flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors', isActive ? 'bg-accent text-primary font-semibold' : 'text-foreground hover:bg-muted/60', )}
              >
                <Icon
                  className={cn('h-5 w-5 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')}
                  aria-hidden
                />
                <span className="text-sm">{t(`settings.tabs.${item.id}`)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SettingsMobileNav({ active, onSelect }: SettingsSidebarProps) {
  const { t } = useTranslation();

  return (
    <div className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
      {NAV_ITEM_IDS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn( 'flex shrink-0 items-center gap-2 rounded-[10px] border px-3 py-2 text-sm transition-colors', isActive ? 'border-primary/30 bg-accent font-medium text-primary' : 'border-border bg-card text-foreground hover:bg-muted/50', )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {t(`settings.tabs.${item.id}`)}
          </button>
        );
      })}
    </div>
  );
}

export function useSettingsTabLabel(tab: SettingsTab): string {
  const { t } = useTranslation();
  return t(`settings.tabs.${tab}`);
}
