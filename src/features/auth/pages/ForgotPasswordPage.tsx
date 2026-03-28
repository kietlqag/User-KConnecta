import React, { useState } from 'react';
import { Link } from 'react-router@7.1.3';
import { ArrowLeft, CheckCircle2, Lock, Mail } from 'lucide-react';
import { authService } from '@/services/authService';
import { AuthCard } from '../components/AuthCard';
import { AuthInput } from '../components/AuthInput';
import { OTPInput } from '../components/OTPInput';

type Step = 'email' | 'otp' | 'reset' | 'success';

export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setErrors({ email: 'Email là bắt buộc' });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Email không hợp lệ' });
      return;
    }

    setIsLoading(true);
    try {
      const { exists } = await authService.checkEmailExists(email);
      if (!exists) {
        setErrors({ email: 'Email chưa có tài khoản' });
        return;
      }

      await authService.sendOtp(email);
      setStep('otp');
      setCountdown(60);
      setOtpExpiresIn(60);
      setErrors({});
    } catch (err) {
      setErrors({ email: err instanceof Error ? err.message : 'Không gửi được mã OTP' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setErrors({ otp: 'Vui lòng nhập đầy đủ mã OTP' });
      return;
    }

    setIsLoading(true);
    try {
      await authService.verifyOtp(email, otp);
      setStep('reset');
      setErrors({});
    } catch (err) {
      setErrors({ otp: err instanceof Error ? err.message : 'Mã OTP không hợp lệ' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (password.length < 8) {
      newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không khớp';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(email, password);
      setStep('success');
      setErrors({});
    } catch (err) {
      setErrors({
        password: err instanceof Error ? err.message : 'Không đặt lại được mật khẩu',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setIsLoading(true);
    try {
      await authService.sendOtp(email);
      setCountdown(60);
      setOtpExpiresIn(60);
      setOtp('');
      setErrors({});
    } catch (err) {
      setErrors({ otp: err instanceof Error ? err.message : 'Không gửi lại được mã OTP' });
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => window.clearTimeout(timer);
    }
  }, [countdown]);

  React.useEffect(() => {
    if (otpExpiresIn > 0) {
      const timer = window.setTimeout(() => setOtpExpiresIn(otpExpiresIn - 1), 1000);
      return () => window.clearTimeout(timer);
    }
  }, [otpExpiresIn]);

  const renderContent = () => {
    const formattedOtpExpiresIn = `${String(Math.floor(otpExpiresIn / 60)).padStart(2, '0')}:${String(
      otpExpiresIn % 60,
    ).padStart(2, '0')}`;

    switch (step) {
      case 'email':
        return (
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="text-emerald-600" size={32} />
              </div>
              <p className="text-gray-600 text-sm">Nhập email của bạn để nhận mã xác thực</p>
            </div>

            <AuthInput
              label="Email"
              name="email"
              type="email"
              placeholder="you@example.com"
              icon={<Mail size={20} />}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors({});
              }}
              error={errors.email}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Đang gửi...
                </span>
              ) : (
                'Gửi mã xác thực'
              )}
            </button>

            <Link
              to="/auth/login"
              className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mt-4"
            >
              <ArrowLeft size={16} />
              Quay lại đăng nhập
            </Link>
          </form>
        );

      case 'otp':
        return (
          <form onSubmit={handleOTPSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-gray-600 text-sm">Nhập mã OTP đã được gửi đến</p>
              <p className="text-emerald-600 font-medium mt-1">{email}</p>
            </div>

            <OTPInput
              value={otp}
              onChange={(value) => {
                setOtp(value);
                setErrors({});
              }}
              error={errors.otp}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Đang xác thực...
                </span>
              ) : (
                'Xác thực'
              )}
            </button>

            <p className="text-sm text-gray-500 text-center -mt-2">
              Mã hết hạn sau:{' '}
              <span className={otpExpiresIn > 10 ? 'font-semibold text-amber-600' : 'font-semibold text-red-500'}>
                {formattedOtpExpiresIn}
              </span>
            </p>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Không nhận được mã?{' '}
                {countdown > 0 ? (
                  <span className="text-gray-400">Gửi lại sau {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Gửi lại
                  </button>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStep('email')}
              className="flex items-center justify-center gap-2 w-full text-sm text-gray-600 hover:text-gray-900 transition-colors mt-4"
            >
              <ArrowLeft size={16} />
              Thay đổi email
            </button>
          </form>
        );

      case 'reset':
        return (
          <form onSubmit={handleResetSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="text-emerald-600" size={32} />
              </div>
              <p className="text-gray-600 text-sm">Tạo mật khẩu mới cho tài khoản của bạn</p>
            </div>

            <AuthInput
              label="Mật khẩu mới"
              name="password"
              type="password"
              placeholder="........"
              icon={<Lock size={20} />}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: '' }));
              }}
              error={errors.password}
            />

            <AuthInput
              label="Xác nhận mật khẩu"
              name="confirmPassword"
              type="password"
              placeholder="........"
              icon={<Lock size={20} />}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              error={errors.confirmPassword}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Đang cập nhật...
                </span>
              ) : (
                'Đặt lại mật khẩu'
              )}
            </button>
          </form>
        );

      case 'success':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="text-green-600" size={40} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Thành công!</h3>
              <p className="text-gray-600 text-sm">Mật khẩu của bạn đã được đặt lại thành công</p>
            </div>
            <Link
              to="/auth/login"
              className="inline-block w-full py-3.5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              Đăng nhập ngay
            </Link>
          </div>
        );

      default:
        return null;
    }
  };

  const titles: Record<Step, string> = {
    email: 'Quên mật khẩu',
    otp: 'Xác thực OTP',
    reset: 'Đặt lại mật khẩu',
    success: 'Hoàn tất',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <AuthCard
        title={titles[step]}
        subtitle={step !== 'success' ? 'Khôi phục tài khoản KConnecta của bạn' : undefined}
      >
        {renderContent()}
      </AuthCard>
    </div>
  );
}
