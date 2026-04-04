import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services/authService';
import { toast } from 'sonner';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [showOldPassword, setShowOldPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword');

  const onSubmit = async (data: any) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để thực hiện thao tác này');
      return;
    }

    setIsLoading(true);
    try {
      await authService.changePassword(currentUser.email, data.oldPassword, data.newPassword);
      toast.success('Đổi mật khẩu thành công');
      onOpenChange(false);
      reset();
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-600" />
            Đổi mật khẩu
          </DialogTitle>
          <DialogDescription>
            Nhập mật khẩu hiện tại và mật khẩu mới của bạn bên dưới.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="oldPassword">Mật khẩu hiện tại</Label>
            <div className="relative">
              <Input
                id="oldPassword"
                type={showOldPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="pr-10"
                {...register('oldPassword', { 
                  required: 'Mật khẩu hiện tại là bắt buộc' 
                })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowOldPassword(!showOldPassword)}
              >
                {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.oldPassword && (
              <p className="text-xs text-red-500">{errors.oldPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Mật khẩu mới</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="pr-10"
                {...register('newPassword', { 
                  required: 'Mật khẩu mới là bắt buộc',
                  minLength: {
                    value: 8,
                    message: 'Mật khẩu phải có ít nhất 8 ký tự'
                  }
                })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-red-500">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="pr-10"
                {...register('confirmPassword', { 
                  required: 'Vui lòng xác nhận mật khẩu mới',
                  validate: (value) => 
                    value === newPassword || 'Mật khẩu xác nhận không khớp'
                })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          <DialogFooter className="pt-4">
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
                  Đang xử lý...
                </>
              ) : (
                'Đổi mật khẩu'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
