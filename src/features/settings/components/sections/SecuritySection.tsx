import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckCircle2, Eye, EyeOff, Loader2, Monitor, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/authService';
import {
  PasswordRequirementsChecklist,
  validateNewPassword,
} from '@/features/auth/components/PasswordRequirementsChecklist';
import { getPasswordChecks } from '@/features/auth/utils/passwordValidation';
import { SettingsSection } from '../SettingsSection';
import { SettingRow } from '../SettingRow';
import { SettingsSaveBar } from '../SettingsSaveBar';
import type { UserSettings } from '../../types/userSettings.types';

interface ChangePasswordForm {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface SecuritySectionProps {
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => void;
  isDirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

function ChangePasswordBlock() {
  const currentUser = authService.getCurrentUser();
  const isSettingPassword = !currentUser?.hasPassword;
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPassword = watch('newPassword');
  const confirmPassword = watch('confirmPassword');
  const oldPassword = watch('oldPassword');
  const { hasAllRequiredChecks } = getPasswordChecks(newPassword || '');
  const canSubmitPassword =
    hasAllRequiredChecks &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword &&
    (isSettingPassword || oldPassword.length > 0) &&
    !isSubmitting;

  const onSubmit = async (data: ChangePasswordForm) => {
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập');
      return;
    }
    try {
      if (isSettingPassword) {
        await authService.setPassword(currentUser.email, data.newPassword);
        authService.saveCurrentUser({ ...currentUser, hasPassword: true });
        toast.success('Đặt mật khẩu thành công');
      } else {
        await authService.changePassword(currentUser.email, data.oldPassword, data.newPassword);
        toast.success('Đổi mật khẩu thành công');
      }
      setSuccess(true);
      reset();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  };

  const inputClass =
    'w-full rounded-[10px] border border-border bg-card px-4 py-2.5 pr-11 text-sm text-foreground outline-none transition-colors focus:ring-2 focus:ring-primary/30';

  if (success) {
    return (
      <div className="flex flex-col items-center rounded-[12px] border border-border bg-card px-6 py-8 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <p className="font-semibold text-foreground">
          {isSettingPassword ? 'Đặt mật khẩu thành công' : 'Đổi mật khẩu thành công'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Mật khẩu của bạn đã được cập nhật.</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 rounded-[10px]"
          onClick={() => setSuccess(false)}
        >
          {isSettingPassword ? 'Đặt mật khẩu khác' : 'Đổi mật khẩu khác'}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-[12px] border border-border bg-card p-5">
      {!isSettingPassword && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Mật khẩu hiện tại</label>
          <div className="relative">
            <input
              type={showOld ? 'text' : 'password'}
              placeholder="••••••••"
              className={inputClass}
              autoComplete="current-password"
              {...register('oldPassword', { required: 'Mật khẩu hiện tại là bắt buộc' })}
            />
            <button
              type="button"
              onClick={() => setShowOld((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.oldPassword ? (
            <p className="mt-1 text-xs text-destructive">{errors.oldPassword.message}</p>
          ) : null}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Mật khẩu mới</label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            placeholder="Ít nhất 8 ký tự"
            className={inputClass}
            autoComplete="new-password"
            {...register('newPassword', {
              required: 'Mật khẩu mới là bắt buộc',
              validate: validateNewPassword,
            })}
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.newPassword ? (
          <p className="mt-1 text-xs text-destructive">{errors.newPassword.message}</p>
        ) : null}
        <PasswordRequirementsChecklist password={newPassword || ''} className="mt-3" />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Xác nhận mật khẩu mới</label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            placeholder="Nhập lại mật khẩu mới"
            className={inputClass}
            autoComplete="new-password"
            {...register('confirmPassword', {
              required: 'Vui lòng xác nhận mật khẩu',
              validate: (v) => v === newPassword || 'Mật khẩu xác nhận không khớp',
            })}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword ? (
          <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={!canSubmitPassword}
        className="w-full rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto disabled:opacity-50"
      >
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isSettingPassword ? 'Đặt mật khẩu' : 'Đổi mật khẩu'}
      </Button>
    </form>
  );
}

function formatLastActive(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Vừa xong';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function SecuritySection({
  settings,
  updateSettings,
  isDirty,
  saving,
  onSave,
  onDiscard,
}: SecuritySectionProps) {
  return (
    <div className="space-y-8">
      <SettingsSection
        title="Đổi mật khẩu"
        description="Cập nhật mật khẩu định kỳ để bảo vệ tài khoản của bạn."
      >
        <ChangePasswordBlock />
      </SettingsSection>

      <SettingsSection
        title="Xác thực hai lớp (2FA)"
        description="Thêm một lớp bảo mật khi đăng nhập bằng mã xác thực."
      >
        <SettingRow
          label="Bật xác thực hai lớp"
          description="Yêu cầu mã OTP khi đăng nhập từ thiết bị mới."
        >
          <div className="flex justify-end sm:justify-start">
            <Switch
              checked={settings.twoFactorEnabled}
              onCheckedChange={(checked) => updateSettings({ twoFactorEnabled: checked })}
            />
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Thiết bị đã đăng nhập"
        description="Quản lý các phiên đăng nhập đang hoạt động trên tài khoản."
      >
        <div className="space-y-2">
          {settings.devices.map((device) => (
            <div
              key={device.id}
              className="flex items-start gap-3 rounded-[10px] border border-border bg-card px-4 py-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-muted">
                {device.deviceName.includes('Điện thoại') ? (
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Monitor className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {device.deviceName} · {device.browser}
                  </p>
                  {device.isCurrent ? (
                    <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-primary">
                      Thiết bị này
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {device.location} · Hoạt động: {formatLastActive(device.lastActive)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSaveBar isDirty={isDirty} saving={saving} onSave={onSave} onDiscard={onDiscard} />
    </div>
  );
}
