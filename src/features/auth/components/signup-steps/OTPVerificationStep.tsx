import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { authService } from '@/services/authService';

interface OTPVerificationStepProps {
  email: string;
  onNext: () => void;
  onBack: () => void;
}

export function OTPVerificationStep({ email, onNext, onBack }: OTPVerificationStepProps) {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const startCooldown = () => {
    setResendCooldown(60);
    setExpiresIn(60);
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && value) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        void handleVerify(fullOtp);
      }
    }
  };

  useEffect(() => {
    if (expiresIn <= 0) return;

    const timer = window.setTimeout(() => {
      setExpiresIn((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [expiresIn]);

  const formattedExpiresIn = `${String(Math.floor(expiresIn / 60)).padStart(2, '0')}:${String(
    expiresIn % 60,
  ).padStart(2, '0')}`;

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();

    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      void handleVerify(pastedData);
    }
  };

  const handleVerify = async (code: string) => {
    setIsLoading(true);
    setError('');

    try {
      await authService.verifyOtp(email, code);
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mã OTP không hợp lệ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join('');

    if (fullOtp.length !== 6) {
      setError('Vui lòng nhập đầy đủ mã OTP');
      return;
    }

    void handleVerify(fullOtp);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setError('');

    try {
      await authService.sendOtp(email);
      startCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gửi lại được mã OTP');
    }
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Quay lại</span>
      </button>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Xác nhận Email</h2>
        <p className="text-gray-600">Chúng tôi đã gửi mã xác nhận đến</p>
        <p className="text-emerald-600 font-semibold mt-1">{email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
            Nhập mã OTP
          </label>
          <div className="flex gap-2 justify-center">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl transition-all focus:outline-none ${
                  error
                    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                    : digit
                      ? 'border-emerald-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200'
                      : 'border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                }`}
                autoFocus={index === 0}
              />
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-red-600 text-center">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading || otp.join('').length !== 6}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Đang xác nhận...
            </span>
          ) : (
            'Xác nhận'
          )}
        </button>

        <p className="text-sm text-gray-500 text-center -mt-2">
          Mã hết hạn sau:{' '}
          <span className={expiresIn > 10 ? 'font-semibold text-amber-600' : 'font-semibold text-red-500'}>
            {formattedExpiresIn}
          </span>
        </p>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Không nhận được mã?{' '}
            {resendCooldown > 0 ? (
              <span className="text-gray-400">Gửi lại sau {resendCooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
              >
                Gửi lại
              </button>
            )}
          </p>
        </div>
      </form>
    </div>
  );
}



