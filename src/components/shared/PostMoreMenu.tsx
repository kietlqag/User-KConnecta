import React, { useState } from 'react';
import {
  MoreHorizontal,
  Bookmark,
  Plus,
  Minus,
  Trash2,
  Shield,
  Globe,
  Users,
  Lock,
  Check,
  AlertTriangle,
  Pencil,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { POSTS_FEED_KEY } from '@/features/home/hooks/usePosts';
import { postService, type ReportCategory } from '@/services/postService';

const REPORT_CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: 'SPAM',           label: 'Spam / Quảng cáo' },
  { value: 'VIOLENCE',       label: 'Bạo lực' },
  { value: 'HATE_SPEECH',    label: 'Ngôn ngữ thù địch' },
  { value: 'NUDITY',         label: 'Nội dung khiêu dâm' },
  { value: 'MISINFORMATION', label: 'Thông tin sai lệch' },
  { value: 'OTHER',          label: 'Lý do khác' },
];

export type Privacy = 'PUBLIC' | 'FRIENDS' | 'FRIENDS_EXCEPT' | 'PRIVATE';

const PRIVACY_OPTIONS: { value: Privacy; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'PUBLIC',  label: 'Công khai',    desc: 'Mọi người đều thấy',   icon: <Globe className="w-5 h-5" /> },
  { value: 'FRIENDS', label: 'Bạn bè',       desc: 'Chỉ bạn bè của bạn',   icon: <Users className="w-5 h-5" /> },
  { value: 'PRIVATE', label: 'Chỉ mình tôi', desc: 'Chỉ bạn mới thấy',     icon: <Lock className="w-5 h-5" /> },
];

interface PostMoreMenuProps {
  postId: string;
  isSaved?: boolean;
  isOwner?: boolean;
  privacy?: Privacy;
  currentUserId?: string;
  onToggleSave?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPrivacyChange?: (privacy: Privacy) => void;
  className?: string;
}

export const PostMoreMenu: React.FC<PostMoreMenuProps> = ({
  postId,
  isSaved = false,
  isOwner = false,
  privacy = 'PUBLIC',
  currentUserId,
  onToggleSave,
  onEdit,
  onDelete,
  onPrivacyChange,
  className,
}) => {
  const [updating, setUpdating] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [reportReason, setReportReason] = useState('');
  const queryClient = useQueryClient();

  const handleAction = (action: string) => {
    switch (action) {
      case 'interested':
        toast.success('Đã cập nhật: Bạn sẽ thấy nhiều bài viết tương tự hơn.');
        break;
      case 'not_interested':
        toast.success('Đã cập nhật: Bạn sẽ thấy ít bài viết tương tự hơn.');
        break;
      default:
        break;
    }
  };

  const handlePrivacySelect = async (newPrivacy: Privacy) => {
    if (newPrivacy === privacy || updating || !currentUserId) return;
    setUpdating(true);
    try {
      await postService.updatePrivacy(postId, currentUserId, newPrivacy);
      onPrivacyChange?.(newPrivacy);
      void queryClient.invalidateQueries({ queryKey: POSTS_FEED_KEY });
      const label = PRIVACY_OPTIONS.find((o) => o.value === newPrivacy)?.label ?? newPrivacy;
      toast.success(`Đã đổi quyền riêng tư thành "${label}"`);
    } catch {
      toast.error('Không thể cập nhật quyền riêng tư. Vui lòng thử lại.');
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenReportDialog = () => {
    if (!currentUserId) {
      toast.error('Vui lòng đăng nhập để báo cáo bài viết.');
      return;
    }
    setSelectedCategory(null);
    setReportReason('');
    setReportDialogOpen(true);
  };

  const handleReportPost = async () => {
    if (reporting || !currentUserId || !selectedCategory) return;

    setReporting(true);
    try {
      await postService.reportPost(postId, currentUserId, selectedCategory, reportReason);
      setReportDialogOpen(false);
      toast.success('Đã gửi báo cáo bài viết tới quản trị viên.');
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Không thể báo cáo bài viết. Vui lòng thử lại.';
      toast.error(message);
    } finally {
      setReporting(false);
    }
  };

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer ${className}`}>
          <MoreHorizontal className="w-5 h-5 text-gray-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2">
        <DropdownMenuItem
          className="flex items-start gap-3 p-3 cursor-pointer"
          onClick={() => handleAction('interested')}
        >
          <div className="mt-1">
            <Plus className="w-6 h-6 text-gray-900 border-2 border-gray-900 rounded-full p-0.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[15px]">Quan tâm</span>
            <span className="text-[13px] text-gray-500">Bạn sẽ nhìn thấy nhiều bài viết tương tự hơn.</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="flex items-start gap-3 p-3 cursor-pointer"
          onClick={() => handleAction('not_interested')}
        >
          <div className="mt-1">
            <Minus className="w-6 h-6 text-gray-900 border-2 border-gray-900 rounded-full p-0.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[15px]">Không quan tâm</span>
            <span className="text-[13px] text-gray-500">Bạn sẽ thấy ít bài viết tương tự hơn.</span>
          </div>
        </DropdownMenuItem>

        <div className="my-1 border-t border-gray-100" />

        {!isOwner && (
          <>
            <DropdownMenuItem
              className="flex items-start gap-3 p-3 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              disabled={reporting}
              onClick={handleOpenReportDialog}
            >
              <div className="mt-1">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[15px]">Báo cáo bài viết</span>
                <span className="text-[13px] text-red-400">Gửi bài viết này cho quản trị viên xem xét.</span>
              </div>
            </DropdownMenuItem>

            <div className="my-1 border-t border-gray-100" />
          </>
        )}

        <DropdownMenuItem
          className="flex items-start gap-3 p-3 cursor-pointer"
          onClick={onToggleSave}
        >
          <div className="mt-1">
            <Bookmark className={`w-6 h-6 ${isSaved ? 'text-blue-600 fill-blue-600' : 'text-gray-900 fill-gray-900'}`} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[15px]">{isSaved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}</span>
            <span className="text-[13px] text-gray-500">
              {isSaved ? 'Xóa khỏi danh sách mục đã lưu.' : 'Thêm vào danh sách mục đã lưu.'}
            </span>
          </div>
        </DropdownMenuItem>

        {isOwner && (
          <>
            <div className="my-1 border-t border-gray-100" />

            <DropdownMenuItem
              className="flex items-start gap-3 p-3 cursor-pointer"
              onClick={onEdit}
            >
              <div className="mt-1">
                <Pencil className="w-6 h-6 text-gray-900" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[15px]">Chỉnh sửa bài viết</span>
                <span className="text-[13px] text-gray-500">Thay đổi nội dung hoặc ảnh/video.</span>
              </div>
            </DropdownMenuItem>

            <div className="my-1 border-t border-gray-100" />

            {/* Privacy submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-start gap-3 p-3 cursor-pointer rounded-md hover:bg-gray-100 w-full">
                <div className="mt-1">
                  <Shield className="w-6 h-6 text-gray-900" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-[15px]">Quyền riêng tư</span>
                  <span className="text-[13px] text-gray-500">
                    {PRIVACY_OPTIONS.find((o) => o.value === privacy)?.label ?? 'Công khai'}
                  </span>
                </div>
              </DropdownMenuSubTrigger>

              <DropdownMenuSubContent className="w-64 p-1">
                <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Ai có thể xem bài viết này?
                </p>
                {PRIVACY_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    className="flex items-center gap-3 p-3 cursor-pointer"
                    disabled={updating}
                    onClick={() => handlePrivacySelect(opt.value)}
                  >
                    <span className="text-gray-700">{opt.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-[14px]">{opt.label}</p>
                      <p className="text-[12px] text-gray-500">{opt.desc}</p>
                    </div>
                    {privacy === opt.value && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <div className="my-1 border-t border-gray-100" />

            <DropdownMenuItem
              className="flex items-start gap-3 p-3 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={onDelete}
            >
              <div className="mt-1">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[15px]">Xóa bài viết</span>
                <span className="text-[13px] text-red-400">Xóa vĩnh viễn bài viết này.</span>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>

    <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Báo cáo bài viết
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600">Chọn lý do báo cáo bài viết này:</p>
          <div className="space-y-2">
            {REPORT_CATEGORIES.map((cat) => (
              <label
                key={cat.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedCategory === cat.value
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="reportCategory"
                  value={cat.value}
                  checked={selectedCategory === cat.value}
                  onChange={() => setSelectedCategory(cat.value)}
                  className="accent-red-600"
                />
                <span className="text-sm font-medium">{cat.label}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Mô tả thêm <span className="text-gray-400">(tuỳ chọn)</span>
            </label>
            <textarea
              className="w-full rounded-md border border-gray-200 p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              rows={3}
              placeholder="Mô tả chi tiết vi phạm..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            disabled={reporting}
            onClick={() => setReportDialogOpen(false)}
          >
            Hủy
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={reporting || !selectedCategory}
            onClick={() => void handleReportPost()}
          >
            {reporting ? 'Đang gửi...' : 'Gửi báo cáo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};
