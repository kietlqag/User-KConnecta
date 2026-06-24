import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  ArrowLeft,
  AtSign,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Mail,
  MapPin,
  Mars,
  User,
  Venus,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { locationService, type Province, type Ward } from '@/services/locationService';
import { AuthInput } from '../AuthInput';
import { clearGoogleSignupSession, decodeGoogleIdTokenPayload } from '../../utils/googleSignupSession';

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
  isGoogleSignup?: boolean;
  googleIdToken?: string;
  onBack: () => void;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export function ProfileSetupStep({
  email,
  password,
  isGoogleSignup = false,
  googleIdToken,
  onBack,
}: ProfileSetupStepProps) {
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);

  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [locationStep, setLocationStep] = useState<'province' | 'ward'>('province');
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [openUpward, setOpenUpward] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const locationPickerRef = useRef<HTMLDivElement | null>(null);

  const normalizeText = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim();

  const locationDisplay = useMemo(() => {
    if (selectedProvince && selectedWard) {
      return `${selectedWard.name}, ${selectedProvince.name}`;
    }
    return profileData.location.trim();
  }, [selectedProvince, selectedWard, profileData.location]);

  const maxDateFor16 = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 16);
    return d.toISOString().split('T')[0];
  }, []);

  const filteredProvinces = useMemo(() => {
    if (!locationQuery.trim()) return provinces;
    const q = normalizeText(locationQuery);
    return provinces.filter((province) => normalizeText(province.name).includes(q));
  }, [locationQuery, provinces]);

  const filteredWards = useMemo(() => {
    if (!locationQuery.trim()) return wards;
    const q = normalizeText(locationQuery);
    return wards.filter((ward) => normalizeText(ward.name).includes(q));
  }, [locationQuery, wards]);

  useEffect(() => {
    if (!isGoogleSignup || !googleIdToken) return;
    const { name } = decodeGoogleIdTokenPayload(googleIdToken);
    if (!name?.trim()) return;
    setProfileData((prev) => (prev.fullName.trim() ? prev : { ...prev, fullName: name.trim() }));
  }, [googleIdToken, isGoogleSignup]);

  useEffect(() => {
    const loadProvinces = async () => {
      setLocationLoading(true);
      setLocationError('');
      try {
        const data = await locationService.getProvinces();
        setProvinces(data);
      } catch (err) {
        setLocationError(err instanceof Error ? err.message : 'Không tải được danh sách tỉnh/thành phố');
      } finally {
        setLocationLoading(false);
      }
    };

    void loadProvinces();
  }, []);

  useEffect(() => {
    if (!isLocationPickerOpen || !locationPickerRef.current) return;

    const rect = locationPickerRef.current.getBoundingClientRect();
    const estimatedDropdownHeight = 360;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    setOpenUpward(spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow);
  }, [isLocationPickerOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!locationPickerRef.current) return;
      if (locationPickerRef.current.contains(event.target as Node)) return;
      setIsLocationPickerOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const username = profileData.username.trim();

    if (!username) {
      setIsUsernameAvailable(null);
      setIsCheckingUsername(false);
      return;
    }

    if (username.length < 3 || !USERNAME_REGEX.test(username)) {
      setIsUsernameAvailable(null);
      setIsCheckingUsername(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const { exists } = await authService.checkUsernameExists(username);
        if (cancelled) return;
        setIsUsernameAvailable(!exists);
        setErrors((prev) => ({
          ...prev,
          username: exists ? 'Tên người dùng đã tồn tại' : undefined,
        }));
      } catch {
        if (cancelled) return;
        setIsUsernameAvailable(null);
      } finally {
        if (!cancelled) {
          setIsCheckingUsername(false);
        }
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [profileData.username]);

  const isAtLeast16 = (dateValue: string) => {
    if (!dateValue) return false;
    const birth = new Date(dateValue);
    if (Number.isNaN(birth.getTime())) return false;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age >= 16;
  };

  const isFullNameValid = profileData.fullName.trim().length >= 2;
  const isUsernameFormatValid =
    profileData.username.trim().length >= 3 && USERNAME_REGEX.test(profileData.username);
  const isDateOfBirthValid =
    profileData.dateOfBirth.length > 0 && isAtLeast16(profileData.dateOfBirth);
  const isGenderValid = profileData.gender.length > 0;

  const canSubmit =
    isFullNameValid &&
    isUsernameFormatValid &&
    isUsernameAvailable === true &&
    !isCheckingUsername &&
    isDateOfBirthValid &&
    isGenderValid &&
    !isLoading;

  const findBestProvinceMatch = (rawProvince: string) => {
    const target = normalizeText(rawProvince).replace(/^tinh\s+|^thanh pho\s+/g, '');
    return (
      provinces.find((province) => normalizeText(province.name).includes(target)) ??
      provinces.find((province) => target.includes(normalizeText(province.name).replace(/^tinh\s+|^thanh pho\s+/g, ''))) ??
      null
    );
  };

  const findBestWardMatch = (wardList: Ward[], candidates: string[]) => {
    const normalizedCandidates = candidates
      .map((candidate) => normalizeText(candidate))
      .filter((candidate) => candidate.length > 0);

    for (const candidate of normalizedCandidates) {
      const exact = wardList.find((ward) => normalizeText(ward.name) === candidate);
      if (exact) return exact;
    }

    for (const candidate of normalizedCandidates) {
      const partial = wardList.find((ward) => normalizeText(ward.name).includes(candidate));
      if (partial) return partial;
    }

    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setProfileData((prev) => ({ ...prev, [name]: value }));
    setSubmitError('');

    if (name === 'username') {
      setIsUsernameAvailable(null);
    }

    if (name === 'dateOfBirth') {
      if (!value) {
        setErrors((prev) => ({ ...prev, dateOfBirth: 'Ngày sinh là bắt buộc' }));
      } else if (!isAtLeast16(value)) {
        setErrors((prev) => ({ ...prev, dateOfBirth: 'Bạn phải từ 16 tuổi trở lên' }));
      } else {
        setErrors((prev) => ({ ...prev, dateOfBirth: undefined }));
      }
      return;
    }

    if (errors[name as keyof ProfileData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleProvinceSelect = async (province: Province) => {
    setSelectedProvince(province);
    setSelectedWard(null);
    setProfileData((prev) => ({ ...prev, location: '' }));
    setLocationStep('ward');
    setLocationQuery('');
    setLocationError('');
    setLocationLoading(true);

    try {
      const provinceWards = await locationService.getWardsByProvinceCode(province.code);
      setWards(provinceWards);
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : 'Không tải được danh sách xã/phường/đặc khu');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleWardSelect = (ward: Ward) => {
    if (!selectedProvince) return;
    setSelectedWard(ward);

    const nextLocation = `${ward.name}, ${selectedProvince.name}`;
    setProfileData((prev) => ({ ...prev, location: nextLocation }));
    setIsLocationPickerOpen(false);
  };

  const clearLocation = () => {
    setSelectedProvince(null);
    setSelectedWard(null);
    setWards([]);
    setLocationStep('province');
    setLocationQuery('');
    setLocationError('');
    setProfileData((prev) => ({ ...prev, location: '' }));
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Trình duyệt không hỗ trợ lấy vị trí hiện tại');
      return;
    }

    setIsDetectingLocation(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { data } = await axios.get<{
            address?: {
              city?: string;
              state?: string;
              town?: string;
              village?: string;
              suburb?: string;
              quarter?: string;
            };
          }>(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}&accept-language=vi`);

          const provinceName = data.address?.state || data.address?.city || data.address?.town || '';
          const wardCandidates = [data.address?.suburb || '', data.address?.quarter || '', data.address?.village || ''].filter(Boolean);

          if (provinceName) {
            const matchedProvince = findBestProvinceMatch(provinceName);
            if (matchedProvince) {
              const provinceWards = await locationService.getWardsByProvinceCode(matchedProvince.code);
              const matchedWard = findBestWardMatch(provinceWards, wardCandidates);

              setSelectedProvince(matchedProvince);
              setWards(provinceWards);
              setLocationStep('ward');

              if (matchedWard) {
                setSelectedWard(matchedWard);
                setProfileData((prev) => ({ ...prev, location: `${matchedWard.name}, ${matchedProvince.name}` }));
              } else {
                setSelectedWard(null);
                setProfileData((prev) => ({ ...prev, location: matchedProvince.name }));
              }

              setIsLocationPickerOpen(false);
              return;
            }
          }

          const fallbackProvinceName = provinceName || 'Việt Nam';
          const fallbackWardName = wardCandidates[0] || '';
          const locationText = fallbackWardName ? `${fallbackWardName}, ${fallbackProvinceName}` : fallbackProvinceName;

          setSelectedProvince(null);
          setSelectedWard(null);
          setProfileData((prev) => ({ ...prev, location: locationText }));
          setIsLocationPickerOpen(false);
        } catch (err) {
          setLocationError(err instanceof Error ? err.message : 'Không lấy được vị trí hiện tại');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      () => {
        setIsDetectingLocation(false);
        setLocationError('Không thể truy cập vị trí. Hãy cấp quyền vị trí cho trình duyệt');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
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
    } else if (!USERNAME_REGEX.test(profileData.username)) {
      newErrors.username = 'Tên người dùng chỉ chứa chữ, số và dấu gạch dưới';
    } else if (isUsernameAvailable === false) {
      newErrors.username = 'Tên người dùng đã tồn tại';
    } else if (isCheckingUsername || isUsernameAvailable === null) {
      newErrors.username = 'Đang kiểm tra tên người dùng, vui lòng chờ';
    }

    if (!profileData.dateOfBirth) {
      newErrors.dateOfBirth = 'Ngày sinh là bắt buộc';
    } else if (!isAtLeast16(profileData.dateOfBirth)) {
      newErrors.dateOfBirth = 'Bạn phải từ 16 tuổi trở lên';
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
      if (isGoogleSignup && !googleIdToken) {
        throw new Error('Thiếu phiên đăng ký Google, vui lòng đăng nhập lại');
      }

      const authUser = isGoogleSignup
        ? await authService.googleCompleteRegister({
            idToken: googleIdToken ?? '',
            fullName: profileData.fullName,
            username: profileData.username,
            dateOfBirth: profileData.dateOfBirth,
            gender: profileData.gender,
            location: profileData.location || undefined,
            bio: profileData.bio || undefined,
          })
        : await authService.register({ email, password, ...profileData });
      if (isGoogleSignup) {
        clearGoogleSignupSession();
      }
      authService.saveCurrentUser(authUser);
      setShowSuccessModal(true);
      window.setTimeout(() => {
        navigate('/home');
      }, 5000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Không tạo được tài khoản');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 text-center shadow-2xl">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tạo tài khoản thành công</p>
          </div>
        </div>
      )}

      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-100 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Quay lại</span>
      </button>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Thiết lập hồ sơ</h2>
        <p className="text-gray-600 dark:text-gray-400">
          {isGoogleSignup ? 'Hoàn tất thông tin cho tài khoản Google của bạn' : 'Hoàn tất thông tin để tạo tài khoản'}
        </p>
      </div>

      {isGoogleSignup && email && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="text-sm text-gray-600 dark:text-gray-400">Tiếp tục với Google</p>
          <p className="mt-1 inline-flex items-center justify-center gap-2 text-base font-semibold text-emerald-700 dark:text-emerald-300">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="break-all">{email}</span>
          </p>
        </div>
      )}

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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ngày sinh</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Calendar size={20} />
            </div>
            <input
              type="date"
              name="dateOfBirth"
              max={maxDateFor16}
              value={profileData.dateOfBirth}
              onChange={handleChange}
              className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl transition-all focus:outline-none ${
                errors.dateOfBirth
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                  : 'border-gray-300 dark:border-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
              }`}
            />
          </div>
          {errors.dateOfBirth && <p className="mt-1.5 text-sm text-red-600">{errors.dateOfBirth}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Giới tính</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Nam', icon: <Mars size={16} /> },
              { label: 'Nữ', icon: <Venus size={16} /> },
              { label: 'Khác', icon: <CircleUserRound size={16} /> },
            ].map(({ label, icon }) => (
              <label
                key={label}
                className={`relative flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                  profileData.gender === label
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="gender"
                  value={label}
                  checked={profileData.gender === label}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className={`text-sm font-medium inline-flex items-center gap-1.5 ${profileData.gender === label ? 'text-emerald-700' : 'text-gray-700 dark:text-gray-300'}`}>
                  {icon}
                  {label}
                </span>
              </label>
            ))}
          </div>
          {errors.gender && <p className="mt-1.5 text-sm text-red-600">{errors.gender}</p>}
        </div>

        <div ref={locationPickerRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vị trí (Tùy chọn)</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLocationPickerOpen((prev) => !prev)}
              className="relative w-full pl-12 pr-10 py-3 border-2 border-gray-300 dark:border-gray-700 rounded-xl text-left text-gray-700 dark:text-gray-300 hover:border-gray-400 transition-all focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            >
              <MapPin size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <span className={locationDisplay ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>{locationDisplay || 'Chọn vị trí'}</span>
              <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
            </button>

            {locationDisplay && (
              <button
                type="button"
                onClick={clearLocation}
                className="absolute right-11 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-400"
                aria-label="Xóa vị trí"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {isLocationPickerOpen && (
            <div className={`absolute z-20 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden max-h-[min(22rem,calc(100vh-14rem))] ${openUpward ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                {locationStep === 'ward' ? (
                  <button type="button" onClick={() => setLocationStep('province')} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-200">
                    <ChevronLeft size={16} />
                    Tỉnh/Thành phố
                  </button>
                ) : (
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tỉnh/Thành phố</span>
                )}
                <span className="text-sm font-semibold text-emerald-700">
                  {locationStep === 'province' ? 'Chọn tỉnh/thành phố' : 'Chọn xã/phường/đặc khu'}
                </span>
              </div>

              <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder={locationStep === 'province' ? 'Tìm tỉnh/thành phố...' : 'Tìm xã/phường/đặc khu...'}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={isDetectingLocation}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isDetectingLocation ? 'Đang lấy vị trí...' : 'Lấy vị trí hiện tại'}
                </button>
              </div>

              <div className="overflow-y-auto max-h-[min(18rem,calc(100vh-18rem))]">
                {locationLoading ? (
                  <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Đang tải dữ liệu...</p>
                ) : locationError ? (
                  <p className="px-4 py-3 text-sm text-red-600">{locationError}</p>
                ) : locationStep === 'province' ? (
                  filteredProvinces.length > 0 ? (
                    filteredProvinces.map((province) => (
                      <button
                        key={province.code}
                        type="button"
                        onClick={() => void handleProvinceSelect(province)}
                        className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                      >
                        {province.name}
                      </button>
                    ))
                  ) : (
                    <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Không tìm thấy tỉnh/thành phố</p>
                  )
                ) : filteredWards.length > 0 ? (
                  filteredWards.map((ward) => (
                    <button
                      key={ward.code}
                      type="button"
                      onClick={() => handleWardSelect(ward)}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      {ward.name}
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Không có dữ liệu xã/phường/đặc khu</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Giới thiệu bản thân (Tùy chọn)</label>
          <textarea
            name="bio"
            value={profileData.bio}
            onChange={handleChange}
            placeholder="Viết vài dòng về bản thân bạn..."
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-700 rounded-xl transition-all focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 resize-none"
            maxLength={200}
          />
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 text-right">{profileData.bio.length}/200</p>
        </div>

        {submitError && <p className="text-sm text-red-600 text-center">{submitError}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
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
