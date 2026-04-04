import * as React from 'react';
import { useForm } from 'react-hook-form';
import { User, MapPin, Home, GraduationCap, Heart, Calendar, Loader2, Camera } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
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

  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      ...initialData,
      day: initialData.dateOfBirth ? initialData.dateOfBirth.split('-')[2]?.replace(/^0/, '') : '',
      month: initialData.dateOfBirth ? initialData.dateOfBirth.split('-')[1]?.replace(/^0/, '') : '',
      year: initialData.dateOfBirth ? initialData.dateOfBirth.split('-')[0] : '',
    },
  });

  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

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

      resizeImage(file, type === 'avatar' ? 400 : 1200, type === 'avatar' ? 400 : 400)
        .then(resizedBase64 => {
          if (type === 'avatar') {
            setAvatarPreview(resizedBase64);
            setValue('avatarUrl', resizedBase64);
          } else {
            setCoverPreview(resizedBase64);
            setValue('coverPhotoUrl', resizedBase64);
          }
        });
    }
  };

  const onSubmit = async (formData: any) => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const updateData = {
        fullName: formData.fullName,
        bio: formData.bio,
        location: formData.location,
        hometown: formData.hometown,
        school: formData.school,
        relationshipStatus: formData.relationship,
        dateOfBirth: formData.year && formData.month && formData.day 
          ? `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`
          : undefined,
        avatarUrl: formData.avatarUrl,
        coverPhotoUrl: formData.coverPhotoUrl,
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
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            Chỉnh sửa thông tin cá nhân
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          {/* Photos */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              📸 Ảnh hồ sơ & Ảnh bìa
            </h3>
            <div className="space-y-4">
              {/* Avatar Photo */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 dark:border-gray-700">
                    <img 
                      src={avatarPreview || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300'} 
                      alt="Avatar preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera className="w-8 h-8" />
                  </button>
                </div>
                <input
                  type="file"
                  ref={avatarInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, 'avatar')}
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  Đổi ảnh đại diện
                </Button>
              </div>

              {/* Cover Photo */}
              <div className="space-y-2">
                <Label>Ảnh bìa</Label>
                <div className="relative h-32 w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 group">
                  <img 
                    src={coverPreview || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200'} 
                    alt="Cover preview" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera className="w-8 h-8" />
                  </button>
                </div>
                <input
                  type="file"
                  ref={coverInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, 'cover')}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => coverInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" /> Chọn ảnh bìa
                </Button>
              </div>
            </div>
          </div>

          <hr className="dark:border-gray-700" />

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4" /> Thông tin cơ bản
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input
                  id="fullName"
                  {...register('fullName', { required: 'Họ và tên là bắt buộc' })}
                  placeholder="Nhập họ và tên"
                />
                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Tiểu sử</Label>
                <textarea
                  id="bio"
                  className="w-full min-h-[80px] px-3 py-2 bg-background border rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('bio')}
                  placeholder="Mô tả về bản thân bạn..."
                />
              </div>
            </div>
          </div>

          {/* Location & education */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Cuộc sống & Học vấn
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="location">Tỉnh/thành phố hiện tại</Label>
                <Input
                  id="location"
                  {...register('location')}
                  placeholder="VD: TP. Hồ Chí Minh"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hometown">Quê quán</Label>
                <Input
                  id="hometown"
                  {...register('hometown')}
                  placeholder="VD: An Giang"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="school">Học vấn</Label>
                <Input
                  id="school"
                  {...register('school')}
                  placeholder="VD: Trường Đại học Công nghệ TP.HCM"
                />
              </div>
            </div>
          </div>

          {/* Personal Details */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Heart className="w-4 h-4" /> Chi tiết cá nhân
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="relationship">Mối quan hệ</Label>
                <select
                  id="relationship"
                  className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                  {...register('relationship')}
                >
                  <option value="">Chọn trạng thái</option>
                  <option value="Độc thân">Độc thân</option>
                  <option value="Đang hẹn hò">Đang hẹn hò</option>
                  <option value="Đã kết hôn">Đã kết hôn</option>
                  <option value="Phức tạp">Phức tạp</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Ngày sinh</Label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    {...register('day')}
                    className="h-10 px-3 py-2 bg-background border rounded-md text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Ngày</option>
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select
                    {...register('month')}
                    className="h-10 px-3 py-2 bg-background border rounded-md text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Tháng</option>
                    {months.map(m => <option key={m} value={m}>Tháng {m}</option>)}
                  </select>
                  <select
                    {...register('year')}
                    className="h-10 px-3 py-2 bg-background border rounded-md text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Năm</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button 
              type="submit" 
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Lưu thay đổi'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
