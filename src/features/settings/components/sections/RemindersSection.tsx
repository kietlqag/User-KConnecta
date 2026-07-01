import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { SettingsSection } from '../SettingsSection';
import { SettingRow } from '../SettingRow';
import { SettingsSaveBar } from '../SettingsSaveBar';
import { toast } from 'sonner';

export function RemindersSection() {
  const [originalSettings, setOriginalSettings] = useState({
    sessionEnabled: false,
    sessionLimit: 30,
    dailyEnabled: false,
    dailyLimit: 120,
  });

  const [settings, setSettings] = useState({
    sessionEnabled: false,
    sessionLimit: 30,
    dailyEnabled: false,
    dailyLimit: 120,
  });

  const [saving, setSaving] = useState(false);

  // Initialize from local storage on mount
  useEffect(() => {
    const sEnabled = localStorage.getItem('kconnecta_reminder_session_enabled') === 'true';
    const sLimit = parseInt(localStorage.getItem('kconnecta_reminder_session_limit') || '30', 10);
    const dEnabled = localStorage.getItem('kconnecta_reminder_daily_enabled') === 'true';
    const dLimit = parseInt(localStorage.getItem('kconnecta_reminder_daily_limit') || '120', 10);

    const initial = {
      sessionEnabled: sEnabled,
      sessionLimit: sLimit,
      dailyEnabled: dEnabled,
      dailyLimit: dLimit,
    };
    setOriginalSettings(initial);
    setSettings(initial);
  }, []);

  const isDirty =
    settings.sessionEnabled !== originalSettings.sessionEnabled ||
    settings.sessionLimit !== originalSettings.sessionLimit ||
    settings.dailyEnabled !== originalSettings.dailyEnabled ||
    settings.dailyLimit !== originalSettings.dailyLimit;

  const isInvalid =
    (settings.sessionEnabled && settings.sessionLimit <= 0) ||
    (settings.dailyEnabled && settings.dailyLimit <= 0);

  const handleSave = () => {
    if (settings.sessionEnabled && settings.sessionLimit <= 0) {
      toast.error('Thời gian giới hạn liên tục phải lớn hơn 0 phút');
      return;
    }
    if (settings.dailyEnabled && settings.dailyLimit <= 0) {
      toast.error('Tổng thời gian cho phép trong ngày phải lớn hơn 0 phút');
      return;
    }

    setSaving(true);
    // Simulate a brief premium loading animation (500ms) like other settings save actions
    setTimeout(() => {
      localStorage.setItem('kconnecta_reminder_session_enabled', String(settings.sessionEnabled));
      localStorage.setItem('kconnecta_reminder_session_limit', String(settings.sessionLimit));
      localStorage.setItem('kconnecta_reminder_daily_enabled', String(settings.dailyEnabled));
      localStorage.setItem('kconnecta_reminder_daily_limit', String(settings.dailyLimit));

      setOriginalSettings(settings);
      setSaving(false);

      // Dispatch a custom event to notify the ScreenTimeTracker instantly
      window.dispatchEvent(new Event('kconnecta_reminders_settings_changed'));
      toast.success('Đã lưu các cài đặt nhắc nhở thành công!');
    }, 500);
  };

  const handleDiscard = () => {
    setSettings(originalSettings);
    toast.info('Đã hủy bỏ các thay đổi');
  };

  // Helper values for display
  const sessionHours = Math.floor(settings.sessionLimit / 60);
  const sessionMinutes = settings.sessionLimit % 60;

  const dailyHours = Math.floor(settings.dailyLimit / 60);
  const dailyMinutes = settings.dailyLimit % 60;

  return (
    <div className="space-y-8">
      <SettingsSection
        title="Nhắc nhở sức khỏe & thời gian sử dụng"
        description="Đặt giới hạn thời gian lướt mạng xã hội liên tục hoặc tổng thời gian trong ngày để cân bằng cuộc sống của bạn."
      >
        {/* Giới hạn truy cập liên tục */}
        <div className="border-b border-border pb-6">
          <SettingRow
            label="Nhắc nhở khi sử dụng liên tục"
            description="Hiển thị thông báo nhắc nhở bạn nghỉ mắt, đứng dậy vận động khi truy cập liên tục quá lâu trong một phiên."
          >
            <div className="flex justify-end sm:justify-start">
              <Switch
                checked={settings.sessionEnabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, sessionEnabled: checked }))
                }
              />
            </div>
          </SettingRow>

          {settings.sessionEnabled && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-in slide-in-from-top-2 duration-200">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap sm:w-[280px] shrink-0">
                Thời gian giới hạn liên tục:
              </span>
              
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={sessionHours}
                  onChange={(e) => {
                    const h = Math.max(0, parseInt(e.target.value, 10) || 0);
                    setSettings((prev) => ({ ...prev, sessionLimit: h * 60 + sessionMinutes }));
                  }}
                  className="w-[64px] rounded-xl border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-center font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-sm text-muted-foreground font-medium">giờ</span>

                <input
                  type="number"
                  min="0"
                  max="59"
                  value={sessionMinutes}
                  onChange={(e) => {
                    const m = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
                    setSettings((prev) => ({ ...prev, sessionLimit: sessionHours * 60 + m }));
                  }}
                  className="w-[64px] rounded-xl border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-center font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-sm text-muted-foreground font-medium">phút</span>
              </div>
            </div>
          )}
        </div>

        {/* Giới hạn tổng thời gian online trong ngày */}
        <div>
          <SettingRow
            label="Giới hạn tổng thời gian hàng ngày"
            description="Thông báo cho bạn khi tổng thời gian truy cập KConnecta trong ngày vượt quá mức cài đặt cho phép."
          >
            <div className="flex justify-end sm:justify-start">
              <Switch
                checked={settings.dailyEnabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, dailyEnabled: checked }))
                }
              />
            </div>
          </SettingRow>

          {settings.dailyEnabled && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-in slide-in-from-top-2 duration-200">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap sm:w-[280px] shrink-0">
                Tổng thời gian cho phép trong ngày:
              </span>
              
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={dailyHours}
                  onChange={(e) => {
                    const h = Math.max(0, parseInt(e.target.value, 10) || 0);
                    setSettings((prev) => ({ ...prev, dailyLimit: h * 60 + dailyMinutes }));
                  }}
                  className="w-[64px] rounded-xl border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-center font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-sm text-muted-foreground font-medium">giờ</span>

                <input
                  type="number"
                  min="0"
                  max="59"
                  value={dailyMinutes}
                  onChange={(e) => {
                    const m = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
                    setSettings((prev) => ({ ...prev, dailyLimit: dailyHours * 60 + m }));
                  }}
                  className="w-[64px] rounded-xl border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-center font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-sm text-muted-foreground font-medium">phút</span>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSaveBar
        isDirty={isDirty && !isInvalid}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
