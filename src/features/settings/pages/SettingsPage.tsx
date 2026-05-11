import { useEffect, useState } from 'react';
import { KeyRound, Loader2, CheckCircle2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Header } from '../../home/components/Header';
import { authService } from '@/services/authService';
import { OTPInput } from '../../auth/components/OTPInput/OTPInput';
import { toast } from 'sonner';

type SettingsSection = 'forgot-password' | 'change-password';
type ForgotStep = 'email' | 'otp' | 'reset' | 'success';

// -- Sidebar -------------------------------------------------------------------

const navItems: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
  { id: 'change-password', label: 'Đổi mật khẩu', icon: <Lock className="w-5 h-5" /> },
  { id: 'forgot-password', label: 'Quên mật khẩu', icon: <KeyRound className="w-5 h-5" /> },
];

function SettingsSidebar({
  active,
  onSelect,
}: {
  active: SettingsSection;
  onSelect: (s: SettingsSection) => void;
}) {
  return (
    <div className="w-[300px] bg-white border-r border-gray-200 min-h-[calc(100vh-56px)] sticky top-14 overflow-y-auto">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Cài đặt</h1>
        <div className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                active === item.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
              }`}
            >
              <span className={active === item.id ? 'text-blue-600' : 'text-gray-600 group-hover:text-blue-600 transition-colors'}>
                {item.icon}
              </span>
              <span className={`font-medium ${active === item.id ? 'text-blue-600' : 'text-gray-900'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// -- Change Password section ---------------------------------------------------

interface ChangePasswordForm {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function ChangePasswordSection() {
  const currentUser = authService.getCurrentUser();
  const isSettingPassword = !currentUser?.hasPassword;

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } =
    useForm<ChangePasswordForm>({ defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' } });

  const newPassword = watch('newPassword');

  const onSubmit = async (data: ChangePasswordForm) => {
    if (!currentUser) { toast.error('Bạn cần đăng nhập'); return; }
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
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra');
    }
  };

  const inputClass = 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-11 transition-colors';
  const btnClass = 'w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2';

  const EyeToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {isSettingPassword ? 'Đặt mật khẩu' : 'Đổi mật khẩu'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {isSettingPassword
            ? 'Tài khoản của bạn chưa có mật khẩu. Đặt mật khẩu để đăng nhập bằng email.'
            : 'Nhập mật khẩu hiện tại và mật khẩu mới để cập nhật.'}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        {success ? (
          <div className="flex flex-col items-center text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {isSettingPassword ? 'Đặt mật khẩu thành công!' : 'Đổi mật khẩu thành công!'}
              </h3>
              <p className="text-sm text-gray-500">Mật khẩu của bạn đã được cập nhật.</p>
            </div>
            <button onClick={() => setSuccess(false)} className={btnClass}>
              {isSettingPassword ? 'Đặt lại mật khẩu khác' : 'Đổi mật khẩu khác'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!isSettingPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    placeholder="........"
                    className={inputClass}
                    {...register('oldPassword', { required: 'Mật khẩu hiện tại là bắt buộc' })}
                  />
                  <EyeToggle show={showOld} onToggle={() => setShowOld(v => !v)} />
                </div>
                {errors.oldPassword && <p className="text-red-500 text-xs mt-1">{errors.oldPassword.message}</p>}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  placeholder="Ít nhất 8 ký tự"
                  className={inputClass}
                  {...register('newPassword', {
                    required: 'Mật khẩu mới là bắt buộc',
                    minLength: { value: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
                  })}
                />
                <EyeToggle show={showNew} onToggle={() => setShowNew(v => !v)} />
              </div>
              {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu mới"
                  className={inputClass}
                  {...register('confirmPassword', {
                    required: 'Vui lòng xác nhận mật khẩu',
                    validate: v => v === newPassword || 'Mật khẩu xác nhận không khớp',
                  })}
                />
                <EyeToggle show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className={`${btnClass} mt-2`}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSettingPassword ? 'Đặt mật khẩu' : 'Đổi mật khẩu'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// -- Forgot Password section ---------------------------------------------------

function ForgotPasswordSection() {
  const [step, setStep] = useState<ForgotStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  useEffect(() => {
    if (otpExpiresIn > 0) {
      const t = setTimeout(() => setOtpExpiresIn(s => s - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [otpExpiresIn]);

  const reset = () => {
    setStep('email'); setEmail(''); setOtp('');
    setPassword(''); setConfirmPassword('');
    setErrors({}); setCountdown(0); setOtpExpiresIn(0);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setErrors({ email: 'Email là bắt buộc' }); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setErrors({ email: 'Email không hợp lệ' }); return; }
    setLoading(true);
    try {
      const { exists } = await authService.checkEmailExists(email);
      if (!exists) { setErrors({ email: 'Email chưa có tài khoản' }); return; }
      await authService.sendOtp(email);
      setStep('otp'); setCountdown(60); setOtpExpiresIn(60); setErrors({});
    } catch (err) {
      setErrors({ email: err instanceof Error ? err.message : 'Không gửi được mã OTP' });
    } finally { setLoading(false); }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setErrors({ otp: 'Vui lòng nhập đầy đủ mã OTP' }); return; }
    setLoading(true);
    try {
      await authService.verifyOtp(email, otp);
      setStep('reset'); setErrors({});
    } catch (err) {
      setErrors({ otp: err instanceof Error ? err.message : 'Mã OTP không hợp lệ' });
    } finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      await authService.sendOtp(email);
      setCountdown(60); setOtpExpiresIn(60); setOtp(''); setErrors({});
    } catch (err) {
      setErrors({ otp: err instanceof Error ? err.message : 'Không gửi lại được mã OTP' });
    } finally { setLoading(false); }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!password) errs.password = 'Mật khẩu là bắt buộc';
    else if (password.length < 8) errs.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    if (!confirmPassword) errs.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    else if (password !== confirmPassword) errs.confirmPassword = 'Mật khẩu không khớp';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      await authService.resetPassword(email, password);
      setStep('success'); setErrors({});
    } catch (err) {
      setErrors({ password: err instanceof Error ? err.message : 'Không đặt lại được mật khẩu' });
    } finally { setLoading(false); }
  };

  const formattedExpiry = `${String(Math.floor(otpExpiresIn / 60)).padStart(2, '0')}:${String(otpExpiresIn % 60).padStart(2, '0')}`;

  const inputClass = 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors';
  const btnClass = 'w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2';

  const stepIndicator = (
    <div className="flex items-center gap-2 mb-6">
      {(['email', 'otp', 'reset'] as const).map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            step === 'success' || (['email', 'otp', 'reset'] as const).indexOf(step) > i
              ? 'bg-blue-600 text-white'
              : step === s
              ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
              : 'bg-gray-100 text-gray-400'
          }`}>
            {i + 1}
          </div>
          {i < 2 && <div className={`h-0.5 w-8 ${(['email', 'otp', 'reset'] as const).indexOf(step) > i || step === 'success' ? 'bg-blue-600' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Quên mật khẩu</h2>
        <p className="text-sm text-gray-500 mt-1">Đặt lại mật khẩu qua email của bạn</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        {step !== 'success' && stepIndicator}

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800 text-sm">Bước 1: Nhập email</p>
                <p className="text-xs text-gray-500">Chúng tôi sẽ gửi mã OTP đến email của bạn</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" placeholder="you@example.com" value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors({}); }} className={inputClass} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <button type="submit" disabled={loading} className={btnClass}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Gửi mã xác thực
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800 text-sm">Bước 2: Xác thực OTP</p>
                <p className="text-xs text-gray-500">
                  Mã đã gửi đến <span className="font-medium text-blue-600">{email}</span>
                </p>
              </div>
            </div>
            <OTPInput value={otp} onChange={(v) => { setOtp(v); setErrors({}); }} error={errors.otp} />
            <p className="text-xs text-gray-500 text-center">
              Mã hết hạn sau:{' '}
              <span className={otpExpiresIn > 10 ? 'font-semibold text-amber-600' : 'font-semibold text-red-500'}>
                {formattedExpiry}
              </span>
            </p>
            <button type="submit" disabled={loading} className={btnClass}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Xác thực
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setStep('email')} className="text-gray-500 hover:text-gray-700">
                Quay lại đổi email
              </button>
              {countdown > 0 ? (
                <span className="text-gray-400">Gửi lại sau {countdown}s</span>
              ) : (
                <button type="button" onClick={handleResendOtp} disabled={loading} className="text-blue-600 hover:text-blue-700 font-medium">
                  Gửi lại mã
                </button>
              )}
            </div>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800 text-sm">Bước 3: Đặt mật khẩu mới</p>
                <p className="text-xs text-gray-500">Tạo mật khẩu mới cho tài khoản của bạn</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
              <input type="password" placeholder="Ít nhất 8 ký tự" value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '' })); }}
                className={inputClass} />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
              <input type="password" placeholder="Nhập lại mật khẩu mới" value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirmPassword: '' })); }}
                className={inputClass} />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>
            <button type="submit" disabled={loading} className={btnClass}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Đặt lại mật khẩu
            </button>
          </form>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Đặt lại thành công!</h3>
              <p className="text-sm text-gray-500">Mật khẩu của bạn đã được cập nhật.</p>
            </div>
            <button onClick={reset} className={btnClass}>Đặt lại mật khẩu khác</button>
          </div>
        )}
      </div>
    </div>
  );
}

// -- Main page -----------------------------------------------------------------

export default function SettingsPage() {
  const [active, setActive] = useState<SettingsSection>('change-password');

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="pt-14 flex">
        <SettingsSidebar active={active} onSelect={setActive} />
        <main className="flex-1 p-8">
          {active === 'change-password' && <ChangePasswordSection />}
          {active === 'forgot-password' && <ForgotPasswordSection />}
        </main>
      </div>
    </div>
  );
}



