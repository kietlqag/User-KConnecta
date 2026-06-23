import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '../../home/components/Header';
import { SettingsSidebar, SettingsMobileNav, SETTINGS_TAB_LABELS } from '../components/SettingsSidebar';
import { SecuritySection } from '../components/sections/SecuritySection';
import { PrivacySection } from '../components/sections/PrivacySection';
import { NotificationsSection } from '../components/sections/NotificationsSection';
import { AppearanceSection } from '../components/sections/AppearanceSection';
import { useUserSettings } from '../hooks/useUserSettings';
import type { SettingsTab } from '../types/userSettings.types';

const VALID_TABS: SettingsTab[] = ['security', 'privacy', 'notifications', 'appearance'];

function parseTab(value: string | null): SettingsTab {
  if (value && VALID_TABS.includes(value as SettingsTab)) {
    return value as SettingsTab;
  }
  return 'security';
}

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => parseTab(searchParams.get('tab')));

  const { settings, updateSettings, isDirty, save, discard, saving } = useUserSettings();

  useEffect(() => {
    const tab = parseTab(searchParams.get('tab'));
    setActiveTab(tab);
  }, [searchParams]);

  const handleSelectTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'security' ? {} : { tab }, { replace: true });
  };

  const sectionProps = useMemo(
    () => ({
      settings,
      updateSettings,
      isDirty,
      saving,
      onSave: () => void save(),
      onDiscard: discard,
    }),
    [settings, updateSettings, isDirty, saving, save, discard],
  );

  return (
    <div className="settings-page min-h-screen bg-background font-['Be_Vietnam_Pro',system-ui,sans-serif]">
      <Header />

      <div className="mx-auto max-w-6xl px-4 pb-12 pt-[calc(56px+1.5rem)] lg:px-8">
        <div className="mb-6 lg:hidden">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cài đặt</h1>
          <p className="mt-1 text-sm text-muted-foreground">Quản lý tài khoản và trải nghiệm KConnecta</p>
        </div>

        <SettingsMobileNav active={activeTab} onSelect={handleSelectTab} />

        <div className="mt-6 flex flex-col gap-8 lg:mt-8 lg:flex-row lg:gap-12">
          <aside className="hidden w-[260px] shrink-0 lg:block">
            <div className="sticky top-[calc(56px+2rem)]">
              <SettingsSidebar active={activeTab} onSelect={handleSelectTab} />
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <header className="mb-8 border-b border-border pb-6">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {SETTINGS_TAB_LABELS[activeTab]}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {activeTab === 'security' &&
                  'Bảo vệ tài khoản với mật khẩu mạnh và xác thực hai lớp.'}
                {activeTab === 'privacy' &&
                  'Kiểm soát ai có thể xem hồ sơ, bài viết và danh sách chặn.'}
                {activeTab === 'notifications' &&
                  'Tùy chỉnh cách bạn nhận thông báo trên KConnecta.'}
                {activeTab === 'appearance' &&
                  'Điều chỉnh giao diện và ngôn ngữ hiển thị.'}
              </p>
            </header>

            {activeTab === 'security' && <SecuritySection {...sectionProps} />}
            {activeTab === 'privacy' && <PrivacySection {...sectionProps} />}
            {activeTab === 'notifications' && <NotificationsSection {...sectionProps} />}
            {activeTab === 'appearance' && <AppearanceSection {...sectionProps} />}
          </main>
        </div>
      </div>
    </div>
  );
}
