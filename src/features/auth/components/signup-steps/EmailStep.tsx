import { useState } from 'react';
import { Mail } from 'lucide-react';
import { AuthInput } from '../AuthInput';
import { authApi } from '@/apis/authApi';

interface EmailStepProps {
  onNext: (email: string) => void;
  initialEmail?: string;
}

export function EmailStep({ onNext, initialEmail = '' }: EmailStepProps) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setError('Email là bắt buộc');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email không hợp lệ');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) return;
    
    setIsLoading(true);
    try {
      await authApi.sendOtp(email);
      onNext(email);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể gửi OTP. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-3xl font-bold text-white">K</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tạo tài khoản mới</h2>
        <p className="text-gray-600">Nhập email của bạn để bắt đầu</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          label="Địa chỉ Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          icon={<Mail size={20} />}
          value={email}
          onChange={handleChange}
          error={error}
          autoFocus
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Đang gửi mã...
            </span>
          ) : (
            'Tiếp tục'
          )}
        </button>

        <p className="text-sm text-gray-500 text-center mt-4">
          Chúng tôi sẽ gửi mã xác nhận đến email của bạn
        </p>
      </form>
    </div>
  );
}