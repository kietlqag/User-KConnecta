import { useEffect, useState } from 'react';
import { X, Mail, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { authService } from '@/services/authService';
import { OTPInput } from '../OTPInput/OTPInput';
import { getPasswordChecks } from '@/features/auth/utils/passwordValidation';

type Step = 'email' | 'otp' | 'reset' | 'success';

interface ForgotPasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ForgotPasswordDialog({ open, onClose }: ForgotPasswordDialogProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('email');
      setEmail('');
      setOtp('');
      setPassword('');
      setConfirmPassword('');
      setErrors({});
      setCountdown(0);
      setOtpExpiresIn(0);
    }
  }, [open]);

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

  if (!open) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setErrors({ email: 'Email là bắt buộc' }); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setErrors({ email: 'Email không hợp lệ' }); return; }
    setLoading(true);
    try {
      const { exists } = await authService.checkEmailExists(email);
      if (!exists) { setErrors({ email: 'Email chưa có tài khoản' }); return; }
      await authService.sendOtp(email);
      setStep('otp');
      setCountdown(60);
      setOtpExpiresIn(60);
      setErrors({});
    } catch (err) {
      setErrors({ email: err instanceof Error ? err.message : 'Không gửi được mã OTP' });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setErrors({ otp: 'Vui lòng nhập đầy đủ mã OTP' }); return; }
    setLoading(true);
    try {
      await authService.verifyOtp(email, otp);
      setStep('reset');
      setErrors({});
    } catch (err) {
      setErrors({ otp: err instanceof Error ? err.message : 'Mã OTP không hợp lệ' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      await authService.sendOtp(email);
      setCountdown(60);
      setOtpExpiresIn(60);
      setOtp('');
      setErrors({});
    } catch (err) {
      setErrors({ otp: err instanceof Error ? err.message : 'Không gửi lại được mã OTP' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const { hasAllRequiredChecks } = getPasswordChecks(password);
    if (!password) errs.password = 'Mật khẩu là bắt buộc';
    else if (password.length < 8) errs.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    else if (!hasAllRequiredChecks) errs.password = 'Mật khẩu phải có chữ hoa, chữ thường và ít nhất một số';
    if (!confirmPassword) errs.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    else if (password !== confirmPassword) errs.confirmPassword = 'Mật khẩu không khớp';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      await authService.resetPassword(email, password);
      setStep('success');
      setErrors({});
    } catch (err) {
      setErrors({ password: err instanceof Error ? err.message : 'Không đặt lại được mật khẩu' });
    } finally {
      setLoading(false);
    }
  };

  const formattedExpiry = `${String(Math.floor(otpExpiresIn / 60)).padStart(2, '0')}:${String(otpExpiresIn % 60).padStart(2, '0')}`;
  const { hasMinLength, hasUpperAndLower, hasNumber, hasAllRequiredChecks } = getPasswordChecks(password);
  const isResetConfirmMatched = confirmPassword.length > 0 && password === confirmPassword;
  const isResetConfirmMismatched = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmitReset = hasAllRequiredChecks && isResetConfirmMatched && !loading;

  const inputClass = 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm';
  const btnClass = 'w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={step !== 'success' ? onClose : undefined} />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Quên mật khẩu</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* -- Step: email -- */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="flex flex-col items-center mb-4">
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                  <Mail className="w-7 h-7 text-emerald-600" />
                </div>
                <p className="text-sm text-gray-500 text-center">Nhập email để nhận mã xác thực đặt lại mật khẩu</p>
              </div>
              <div>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                  className={inputClass}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              <button type="submit" disabled={loading} className={btnClass}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Gửi mã xác thực
              </button>
            </form>
          )}

          {/* -- Step: OTP -- */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="flex flex-col items-center mb-4">
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                  <Lock className="w-7 h-7 text-emerald-600" />
                </div>
                <p className="text-sm text-gray-500 text-center">
                  Nhập mã OTP đã gửi đến <span className="font-medium text-emerald-600">{email}</span>
                </p>
              </div>
              <OTPInput value={otp} onChange={(v) => { setOtp(v); setErrors({}); }} error={errors.otp} />
              <p className="text-xs text-gray-500 text-center">
                Mã hết hạn sau:{' '}
                <span className={otpExpiresIn > 10 ? 'font-semibold text-amber-600' : 'font-semibold text-red-500'}>
                  {formattedExpiry}
                </span>
              </p>
              <button type="submit" disabled={loading} className={btnClass}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Xác thực
              </button>
              <div className="text-center text-sm text-gray-600">
                Không nhận được mã?{' '}
                {countdown > 0 ? (
                  <span className="text-gray-400">Gửi lại sau {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    Gửi lại
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Quay lại đổi email
              </button>
            </form>
          )}

          {/* -- Step: reset -- */}
          {step === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="flex flex-col items-center mb-4">
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                  <Lock className="w-7 h-7 text-emerald-600" />
                </div>
                <p className="text-sm text-gray-500 text-center">Tạo mật khẩu mới cho tài khoản của bạn</p>
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Mật khẩu mới (Ít nhất 8 ký tự)"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '' })); }}
                  className={inputClass}
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Xác nhận mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirmPassword: '' })); }}
                  className={`${inputClass} ${
                    isResetConfirmMatched
                      ? 'border-green-500 focus:ring-green-500'
                      : isResetConfirmMismatched
                        ? 'border-red-500 focus:ring-red-500'
                        : ''
                  }`}
                />
                {(errors.confirmPassword || isResetConfirmMismatched) && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirmPassword || 'Mật khẩu không khớp'}</p>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-medium text-gray-700">Mật khẩu phải có:</p>
                <p className="text-xs text-gray-600">{hasMinLength ? '✓' : '•'} Ít nhất 8 ký tự</p>
                <p className="text-xs text-gray-600">{hasUpperAndLower ? '✓' : '•'} Chữ hoa và chữ thường</p>
                <p className="text-xs text-gray-600">{hasNumber ? '✓' : '•'} Ít nhất một số</p>
              </div>
              <button type="submit" disabled={!canSubmitReset} className={btnClass}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Đặt lại mật khẩu
              </button>
            </form>
          )}

          {/* -- Step: success -- */}
          {step === 'success' && (
            <div className="flex flex-col items-center text-center space-y-4 py-2">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Thành công!</h3>
                <p className="text-sm text-gray-500">Mật khẩu đã được đặt lại thành công.</p>
              </div>
              <button onClick={onClose} className={btnClass}>
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



