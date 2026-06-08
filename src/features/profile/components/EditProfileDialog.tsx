import * as React from 'react';
import { useForm } from 'react-hook-form';
import { User, MapPin, Heart, Loader2, Camera, Briefcase } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { authService } from '@/services/authService';

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: {
    fullName: string;
    location?: string;
    hometown?: string;
    school?: string;
    workplace?: string;
    jobTitle?: string;
    relationship?: string;
    birthday?: string;
    dateOfBirth?: string;
    bio?: string;
    avatarUrl?: string;
    coverPhotoUrl?: string;
  };
}

export function EditProfileDialog({ open, onOpenChange, initialData }: EditProfileDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const currentUser = authService.getCurrentUser();
  const [avatarPreview, setAvatarPreview] = React.useState(initialData.avatarUrl);
  const [coverPreview, setCoverPreview] = React.useState(initialData.coverPhotoUrl);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [coverFile, setCoverFile] = React.useState<File | null>(null);

  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);

  const buildFormValues = React.useCallback(
    (data: EditProfileDialogProps['initialData']) => ({
      fullName: data.fullName || '',
      bio: data.bio || '',
      location: data.location || '',
      hometown: data.hometown || '',
      school: data.school || '',
      workplace: data.workplace || '',
      jobTitle: data.jobTitle || '',
      relationship: data.relationship || '',
      day: data.dateOfBirth ? data.dateOfBirth.split('-')[2]?.replace(/^0/, '') : '',
      month: data.dateOfBirth ? data.dateOfBirth.split('-')[1]?.replace(/^0/, '') : '',
      year: data.dateOfBirth ? data.dateOfBirth.split('-')[0] : '',
    }),
    [],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: buildFormValues(initialData),
  });

  React.useEffect(() => {
    if (!open) return;
    reset(buildFormValues(initialData));
    setAvatarPreview(initialData.avatarUrl);
    setCoverPreview(initialData.coverPhotoUrl);
    setAvatarFile(null);
    setCoverFile(null);
    // Chỉ nạp lại form khi mở dialog, tránh reset khi parent re-render lúc đang gõ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Kích thước ảnh không được vượt quá 5MB');
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      if (type === 'avatar') {
        setAvatarFile(file);
        setAvatarPreview(previewUrl);
      } else {
        setCoverFile(file);
        setCoverPreview(previewUrl);
      }
    }
  };

  const onSubmit = async (formData: any) => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      // Upload avatar if a new file was selected
      if (avatarFile) {
        await authService.uploadAvatar(currentUser.id, avatarFile);
      }

      // Upload cover photo if a new file was selected
      if (coverFile) {
        await authService.uploadCoverPhoto(currentUser.id, coverFile);
      }

      // Update other profile fields
      const updateData = {
        fullName: formData.fullName,
        bio: formData.bio,
        location: formData.location,
        hometown: formData.hometown,
        school: formData.school,
        workplace: formData.workplace,
        jobTitle: formData.jobTitle,
        relationshipStatus: formData.relationship,
        dateOfBirth: formData.year && formData.month && formData.day
          ? `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`
          : undefined,
      };

      const updatedUser = await authService.updateProfile(currentUser.id, updateData);

      authService.saveCurrentUser(updatedUser);

      toast.success('Cập nhật thông tin thành công');
      onOpenChange(false);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 max-w-none w-full h-full p-0 m-0 border-none rounded-none overflow-hidden flex flex-col bg-white dark:bg-gray-900 translate-x-0 translate-y-0 top-0 left-0 md:max-w-none sm:max-w-none">
        {/* Header - Fixed at top */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Chỉnh sửa trang cá nhân</DialogTitle>
              <DialogDescription className="sr-only">Chỉnh sửa thông tin trang cá nhân của bạn</DialogDescription>
              <p className="text-xs text-gray-500 dark:text-gray-400">Cập nhật hình ảnh và thông tin của bạn</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-full w-10 h-10 p-0"
            >
              <Loader2 className="w-5 h-5 opacity-0" /> {/* Spacer */}
              <span className="sr-only">Đóng</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex overflow-hidden">
          {/* Main Layout Grid */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr] h-full overflow-hidden">
            
            {/* Left Column: Photos (Scrollable independent) */}
            <div className="bg-gray-50 dark:bg-gray-800/50 border-r dark:border-gray-800 overflow-y-auto p-6 md:p-8 space-y-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    📸 Hình ảnh
                  </h3>
                </div>

                {/* Avatar Section */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 flex flex-col items-center">
                  <Label className="mb-4 text-gray-500 uppercase tracking-wider text-[10px] font-bold">Ảnh đại diện</Label>
                  <div className="relative group">
                    <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-emerald-500 ring-4 ring-white dark:ring-gray-900 shadow-xl">
                      <img 
                        src={avatarPreview || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300'} 
                        alt="Avatar preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm"
                    >
                      <Camera className="w-10 h-10" />
                    </button>
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-10 h-10 rounded-full border-4 border-white dark:border-gray-900 flex items-center justify-center text-white shadow-lg">
                      <Camera className="w-4 h-4" />
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'avatar')}
                  />
                  <p className="mt-4 text-xs text-center text-gray-400">Định dạng JPG, PNG hoặc WebP. <br/>Tối đa 5MB.</p>
                </div>

                {/* Cover Section */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700">
                  <Label className="mb-4 block text-gray-500 uppercase tracking-wider text-[10px] font-bold">Ảnh bìa</Label>
                  <div className="relative h-44 w-full rounded-xl overflow-hidden border dark:border-gray-700 bg-gray-50 dark:bg-gray-900 group">
                    <img 
                      src={coverPreview || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200'} 
                      alt="Cover preview" 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Camera className="w-8 h-8" />
                        <span className="text-xs font-medium">Thay đổi ảnh bìa</span>
                      </div>
                    </button>
                  </div>
                  <input
                    type="file"
                    ref={coverInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'cover')}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Info Form (Scrollable independent) */}
            <div className="overflow-y-auto p-6 md:p-10 lg:p-16 bg-white dark:bg-gray-900">
              <div className="max-w-3xl mx-auto space-y-12">
                
                {/* Section: Identity */}
                <section className="space-y-6">
                  <div className="flex items-center gap-4 pb-2 border-b dark:border-gray-800">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Danh tính</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-xs font-bold text-gray-500 uppercase">Họ và tên</Label>
                      <Input
                        id="fullName"
                        className="h-12 text-lg focus:ring-emerald-500"
                        {...register('fullName', { required: 'Họ và tên là bắt buộc' })}
                        placeholder="Họ và tên hiển thị"
                      />
                      {errors.fullName && <p className="text-xs text-red-500 font-medium">{errors.fullName.message}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-xs font-bold text-gray-500 uppercase">Tiểu sử</Label>
                      <textarea
                        id="bio"
                        className="w-full min-h-[120px] px-4 py-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-md focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all"
                        {...register('bio')}
                        placeholder="Hãy chia sẻ điều gì đó về bản thân bạn..."
                      />
                    </div>
                  </div>
                </section>

                {/* Section: Residence & Education */}
                <section className="space-y-6">
                  <div className="flex items-center gap-4 pb-2 border-b dark:border-gray-800">
                    <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Cuộc sống & Học vấn</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-xs font-bold text-gray-500 uppercase">Tỉnh/Thành phố hiện tại</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <Input
                          id="location"
                          className="pl-11 h-12 dark:bg-gray-800"
                          {...register('location')}
                          placeholder="VD: TP. Hồ Chí Minh"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="hometown" className="text-xs font-bold text-gray-500 uppercase">Quê quán</Label>
                      <div className="relative">
                        <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        <Input
                          id="hometown"
                          className="pl-11 h-12 dark:bg-gray-800"
                          {...register('hometown')}
                          placeholder="VD: An Giang"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="school" className="text-xs font-bold text-gray-500 uppercase">Nơi học tập</Label>
                      <div className="relative">
                        <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                        <Input
                          id="school"
                          className="pl-11 h-12 dark:bg-gray-800"
                          {...register('school')}
                          placeholder="VD: Trường Đại học Công nghệ TP.HCM"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section: Work */}
                <section className="space-y-6">
                  <div className="flex items-center gap-4 pb-2 border-b dark:border-gray-800">
                    <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Công việc</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label htmlFor="workplace" className="text-xs font-bold text-gray-500 uppercase">Nơi làm việc</Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <Input
                          id="workplace"
                          className="pl-11 h-12 dark:bg-gray-800"
                          {...register('workplace')}
                          placeholder="VD: Công ty ABC"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="jobTitle" className="text-xs font-bold text-gray-500 uppercase">Chức danh</Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <Input
                          id="jobTitle"
                          className="pl-11 h-12 dark:bg-gray-800"
                          {...register('jobTitle')}
                          placeholder="VD: Lập trình viên"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section: Personal Status */}
                <section className="space-y-6 pt-4">
                  <div className="flex items-center gap-4 pb-2 border-b dark:border-gray-800">
                    <div className="w-1.5 h-6 bg-red-500 rounded-full"></div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Trạng thái cá nhân</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label htmlFor="relationship" className="text-xs font-bold text-gray-500 uppercase">Mối quan hệ</Label>
                      <div className="relative">
                        <Heart className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <select
                          id="relationship"
                          className="w-full h-12 pl-11 pr-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg text-md focus:ring-2 focus:ring-emerald-500 appearance-none shadow-sm"
                          {...register('relationship')}
                        >
                          <option value="">Chọn trạng thái</option>
                          <option value="Độc thân">Độc thân</option>
                          <option value="Đang hẹn hò">Đang hẹn hò</option>
                          <option value="Đã kết hôn">Đã kết hôn</option>
                          <option value="Phức tạp">Phức tạp</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-500 uppercase">Ngày tháng năm sinh</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          {...register('day')}
                          className="h-12 px-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 shadow-sm"
                        >
                          <option value="">Ngày</option>
                          {days.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select
                          {...register('month')}
                          className="h-12 px-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 shadow-sm"
                        >
                          <option value="">Tháng</option>
                          {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select
                          {...register('year')}
                          className="h-12 px-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 shadow-sm"
                        >
                          <option value="">Năm</option>
                          {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </section>
                
                {/* Submit Area - Bottom of scrolling area */}
                <div className="pt-8 border-t dark:border-gray-800 flex justify-end gap-4 pb-20">
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    onClick={() => onOpenChange(false)}
                    disabled={isLoading}
                    className="px-8"
                  >
                    Hủy
                  </Button>
                  <Button 
                    type="submit" 
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-12 shadow-lg shadow-emerald-500/20 rounded-xl h-14"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      'Lưu thay đổi'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
