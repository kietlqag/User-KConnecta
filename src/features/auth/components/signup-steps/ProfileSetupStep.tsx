import { useState } from 'react';
import { ArrowLeft, AtSign, Calendar, MapPin, User } from 'lucide-react';
import { useNavigate } from 'react-router@7.1.3';
import { authService } from '@/services/authService';
import { AuthInput } from '../AuthInput';

interface ProfileData {
  fullName: string;
  username: string;
  dateOfBirth: string;
  gender: string;
  location: string;
  bio: string;
}

interface ProfileSetupStepProps {
  email: string;
  password: string;
  onBack: () => void;
}

export function ProfileSetupStep({ email, password, onBack }: ProfileSetupStepProps) {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData>({
    fullName: '',
    username: '',
    dateOfBirth: '',
    gender: '',
    location: '',
    bio: '',
  });
  const [errors, setErrors] = useState<Partial<ProfileData>>({});
  const [submitError, setSubmitError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
    setSubmitError('');

    if (errors[name as keyof ProfileData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateProfile = (): boolean => {
    const newErrors: Partial<ProfileData> = {};

    if (!profileData.fullName.trim()) {
      newErrors.fullName = 'Họ và tên là bắt buộc';
    } else if (profileData.fullName.trim().length < 2) {
      newErrors.fullName = 'Họ và tên phải có ít nhất 2 ký tự';
    }

    if (!profileData.username.trim()) {
      newErrors.username = 'Tên người dùng là bắt buộc';
    } else if (profileData.username.length < 3) {
      newErrors.username = 'Tên người dùng phải có ít nhất 3 ký tự';
    } else if (!/^[a-zA-Z0-9_]+$/.test(profileData.username)) {
      newErrors.username = 'Tên người dùng chỉ chứa chữ, số và dấu gạch dưới';
    }

    if (!profileData.dateOfBirth) {
      newErrors.dateOfBirth = 'Ngày sinh là bắt buộc';
    }

    if (!profileData.gender) {
      newErrors.gender = 'Vui lòng chọn giới tính';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateProfile()) return;

    setIsLoading(true);
    setSubmitError('');

    try {
      await authService.register({
        email,
        password,
        ...profileData,
      });
      navigate('/home');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Không tạo được tài khoản');
    } finally {
      setIsLoading(false);
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thiết lập hồ sơ</h2>
        <p className="text-gray-600">Hoàn tất thông tin để tạo tài khoản</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          label="Họ và tên"
          name="fullName"
          type="text"
          placeholder="Nguyễn Văn A"
          icon={<User size={20} />}
          value={profileData.fullName}
          onChange={handleChange}
          error={errors.fullName}
          autoFocus
        />

        <AuthInput
          label="Tên người dùng"
          name="username"
          type="text"
          placeholder="username123"
          icon={<AtSign size={20} />}
          value={profileData.username}
          onChange={handleChange}
          error={errors.username}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ngày sinh</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Calendar size={20} />
            </div>
            <input
              type="date"
              name="dateOfBirth"
              value={profileData.dateOfBirth}
              onChange={handleChange}
              className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl transition-all focus:outline-none ${
                errors.dateOfBirth
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                  : 'border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
              }`}
            />
          </div>
          {errors.dateOfBirth && <p className="mt-1.5 text-sm text-red-600">{errors.dateOfBirth}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Giới tính</label>
          <div className="grid grid-cols-3 gap-3">
            {['Nam', 'Nữ', 'Khác'].map((gender) => (
              <label
                key={gender}
                className={`relative flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                  profileData.gender === gender
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="gender"
                  value={gender}
                  checked={profileData.gender === gender}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span
                  className={`text-sm font-medium ${
                    profileData.gender === gender ? 'text-emerald-700' : 'text-gray-700'
                  }`}
                >
                  {gender}
                </span>
              </label>
            ))}
          </div>
          {errors.gender && <p className="mt-1.5 text-sm text-red-600">{errors.gender}</p>}
        </div>

        <AuthInput
          label="Vị trí (Tùy chọn)"
          name="location"
          type="text"
          placeholder="TP. Hồ Chí Minh, Việt Nam"
          icon={<MapPin size={20} />}
          value={profileData.location}
          onChange={handleChange}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Giới thiệu bản thân (Tùy chọn)</label>
          <textarea
            name="bio"
            value={profileData.bio}
            onChange={handleChange}
            placeholder="Viết vài dòng về bản thân bạn..."
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl transition-all focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 resize-none"
            maxLength={200}
          />
          <p className="mt-1.5 text-xs text-gray-500 text-right">{profileData.bio.length}/200</p>
        </div>

        {submitError && <p className="text-sm text-red-600 text-center">{submitError}</p>}

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
              Đang tạo tài khoản...
            </span>
          ) : (
            'Hoàn tất đăng ký'
          )}
        </button>
      </form>
    </div>
  );
}
