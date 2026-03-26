import { useState } from 'react';
import { ArrowLeft, User, AtSign, Calendar, MapPin } from 'lucide-react';
import { AuthInput } from '../AuthInput';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/apis/authApi';

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
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name as keyof ProfileData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
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
    try {
      await authApi.register({
        email,
        password,
        fullName: profileData.fullName,
        username: profileData.username,
        dateOfBirth: profileData.dateOfBirth || undefined,
        gender: profileData.gender,
        location: profileData.location || undefined,
        bio: profileData.bio || undefined,
      });
      navigate('/home');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      setErrors(prev => ({ ...prev, fullName: msg }));
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
        {/* Full Name */}
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

        {/* Username */}
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

        {/* Date of Birth */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ngày sinh
          </label>
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
          {errors.dateOfBirth && (
            <p className="mt-1.5 text-sm text-red-600">{errors.dateOfBirth}</p>
          )}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Giới tính
          </label>
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
                <span className={`text-sm font-medium ${
                  profileData.gender === gender ? 'text-emerald-700' : 'text-gray-700'
                }`}>
                  {gender}
                </span>
                {profileData.gender === gender && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </label>
            ))}
          </div>
          {errors.gender && (
            <p className="mt-1.5 text-sm text-red-600">{errors.gender}</p>
          )}
        </div>

        {/* Location (Optional) */}
        <AuthInput
          label="Vị trí (Tùy chọn)"
          name="location"
          type="text"
          placeholder="TP. Hồ Chí Minh, Việt Nam"
          icon={<MapPin size={20} />}
          value={profileData.location}
          onChange={handleChange}
        />

        {/* Bio (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Giới thiệu bản thân (Tùy chọn)
          </label>
          <textarea
            name="bio"
            value={profileData.bio}
            onChange={handleChange}
            placeholder="Viết vài dòng về bản thân bạn..."
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl transition-all focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 resize-none"
            maxLength={200}
          />
          <p className="mt-1.5 text-xs text-gray-500 text-right">
            {profileData.bio.length}/200
          </p>
        </div>

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

        <p className="text-xs text-gray-500 text-center mt-4">
          Bằng cách nhấn "Hoàn tất đăng ký", bạn đồng ý với{' '}
          <a href="#" className="text-emerald-600 hover:text-emerald-700 font-medium">
            Điều khoản dịch vụ
          </a>{' '}
          và{' '}
          <a href="#" className="text-emerald-600 hover:text-emerald-700 font-medium">
            Chính sách bảo mật
          </a>{' '}
          của KConnecta
        </p>
      </form>
    </div>
  );
}