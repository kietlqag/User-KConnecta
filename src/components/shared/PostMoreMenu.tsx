import React, { useState } from 'react';
import {
  MoreHorizontal,
  Bookmark,
  Trash2,
  Shield,
  Check,
  AlertTriangle,
  Pencil,
  Pin,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { ProfilePostAudienceModal } from '@/features/profile/components/ProfileCreatePost/ProfilePostAudienceModal';
import {
  apiPrivacyToAudience,
  audienceToApiPrivacy,
  getAudienceLabel,
  type AudienceId,
  type PostPrivacy,
} from '@/features/profile/components/ProfileCreatePost/postAudienceUtils';

const REPORT_CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: 'SPAM',           label: 'Spam / Quảng cáo' },
  { value: 'VIOLENCE',       label: 'Bạo lực' },
  { value: 'HATE_SPEECH',    label: 'Ngôn ngữ thù địch' },
  { value: 'NUDITY',         label: 'Nội dung khiêu dâm' },
  { value: 'MISINFORMATION', label: 'Thông tin sai lệch' },
  { value: 'OTHER',          label: 'Lý do khác' },
];

export type { PostPrivacy as Privacy };

interface PostMoreMenuProps {
  postId: string;
  isSaved?: boolean;
  isOwner?: boolean;
  privacy?: PostPrivacy;
  excludedUserIds?: string[];
  allowedUserIds?: string[];
  isGroupPost?: boolean;
  currentUserId?: string;
  onToggleSave?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPrivacyChange?: (
    privacy: PostPrivacy,
    excludedUserIds: string[],
    allowedUserIds: string[],
  ) => void;
  canPin?: boolean;
  isPinned?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
  className?: string;
}

export const PostMoreMenu: React.FC<PostMoreMenuProps> = ({
  postId,
  isSaved = false,
  isOwner = false,
  privacy = 'PUBLIC',
  excludedUserIds = [],
  allowedUserIds = [],
  isGroupPost = false,
  currentUserId,
  onToggleSave,
  onEdit,
  onDelete,
  onPrivacyChange,
  canPin = false,
  isPinned = false,
  onPin,
  onUnpin,
  className,
}) => {
  const [updating, setUpdating] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const queryClient = useQueryClient();

  const audience = apiPrivacyToAudience(privacy);
  const privacyLabel = getAudienceLabel(audience, excludedUserIds.length, allowedUserIds.length);

  const handleAudienceSelect = async (
    nextAudience: AudienceId,
    nextExcluded: string[],
    nextAllowed: string[],
  ) => {
    if (!currentUserId || updating) return;

    const nextPrivacy = audienceToApiPrivacy(nextAudience);
    const samePrivacy = nextPrivacy === privacy;
    const sameExcluded =
      nextPrivacy === 'FRIENDS_EXCEPT' &&
      nextExcluded.length === excludedUserIds.length &&
      nextExcluded.every((id) => excludedUserIds.includes(id));
    const sameAllowed =
      nextPrivacy === 'SPECIFIC_FRIENDS' &&
      nextAllowed.length === allowedUserIds.length &&
      nextAllowed.every((id) => allowedUserIds.includes(id));

    if (samePrivacy && (nextPrivacy === 'PUBLIC' || nextPrivacy === 'FRIENDS' || nextPrivacy === 'PRIVATE' || sameExcluded || sameAllowed)) {
      if (
        (nextPrivacy === 'PUBLIC' || nextPrivacy === 'FRIENDS' || nextPrivacy === 'PRIVATE') &&
        samePrivacy
      ) {
        return;
      }
      if (nextPrivacy === 'FRIENDS_EXCEPT' && sameExcluded) return;
      if (nextPrivacy === 'SPECIFIC_FRIENDS' && sameAllowed) return;
    }

    setUpdating(true);
    try {
      await postService.updatePrivacy(postId, {
        privacy: nextPrivacy,
        ...(nextPrivacy === 'FRIENDS_EXCEPT' ? { excludedUserIds: nextExcluded } : {}),
        ...(nextPrivacy === 'SPECIFIC_FRIENDS' ? { allowedUserIds: nextAllowed } : {}),
      });
      onPrivacyChange?.(nextPrivacy, nextExcluded, nextAllowed);
      void queryClient.invalidateQueries({ queryKey: POSTS_FEED_KEY });
      toast.success(`Đã đổi quyền riêng tư thành "${getAudienceLabel(nextAudience, nextExcluded.length, nextAllowed.length)}"`);
      setShowAudienceModal(false);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Không thể cập nhật quyền riêng tư. Vui lòng thử lại.';
      toast.error(message);
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
        <button className={`p-2 hover:bg-muted rounded-full transition-colors cursor-pointer ${className}`}>
          <MoreHorizontal className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2">
        {canPin && (
          <>
            <DropdownMenuItem
              className="flex items-start gap-3 p-3 cursor-pointer"
              onClick={isPinned ? onUnpin : onPin}
            >
              <div className="mt-1">
                <Pin className={`w-6 h-6 ${isPinned ? 'text-emerald-600 fill-emerald-600' : 'text-gray-900 dark:text-gray-100'}`} />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[15px]">{isPinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết'}</span>
                <span className="text-[13px] text-gray-500 dark:text-gray-400">
                  {isPinned ? 'Gỡ khỏi khu bài viết nổi bật của nhóm.' : 'Đưa lên khu bài viết nổi bật của nhóm.'}
                </span>
              </div>
            </DropdownMenuItem>
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
          </>
        )}
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

            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
          </>
        )}

        <DropdownMenuItem
          className="flex items-start gap-3 p-3 cursor-pointer"
          onClick={onToggleSave}
        >
          <div className="mt-1">
            <Bookmark className={`w-6 h-6 ${isSaved ? 'text-emerald-600 fill-emerald-600' : 'text-gray-900 dark:text-gray-100 fill-gray-900'}`} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[15px]">{isSaved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}</span>
            <span className="text-[13px] text-gray-500 dark:text-gray-400">
              {isSaved ? 'Xóa khỏi danh sách mục đã lưu.' : 'Thêm vào danh sách mục đã lưu.'}
            </span>
          </div>
        </DropdownMenuItem>

        {isOwner && (
          <>
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

            <DropdownMenuItem
              className="flex items-start gap-3 p-3 cursor-pointer"
              onClick={onEdit}
            >
              <div className="mt-1">
                <Pencil className="w-6 h-6 text-gray-900 dark:text-gray-100" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[15px]">Chỉnh sửa bài viết</span>
                <span className="text-[13px] text-gray-500 dark:text-gray-400">Thay đổi nội dung hoặc ảnh/video.</span>
              </div>
            </DropdownMenuItem>

            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

            {isGroupPost ? (
              <div className="flex items-start gap-3 p-3 opacity-80">
                <div className="mt-1">
                  <Shield className="w-6 h-6 text-gray-900 dark:text-gray-100" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-[15px]">Quyền riêng tư</span>
                  <span className="text-[13px] text-gray-500 dark:text-gray-400">
                    Bài viết trong nhóm theo quyền riêng tư của nhóm, không thể thay đổi riêng.
                  </span>
                </div>
              </div>
            ) : (
              <DropdownMenuItem
                className="flex items-start gap-3 p-3 cursor-pointer"
                disabled={updating}
                onClick={() => setShowAudienceModal(true)}
              >
                <div className="mt-1">
                  <Shield className="w-6 h-6 text-gray-900 dark:text-gray-100" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-[15px]">Quyền riêng tư</span>
                  <span className="text-[13px] text-gray-500 dark:text-gray-400">{privacyLabel}</span>
                </div>
              </DropdownMenuItem>
            )}

            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

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

    {!isGroupPost && (
      <ProfilePostAudienceModal
        isOpen={showAudienceModal}
        onClose={() => setShowAudienceModal(false)}
        selectedAudience={audience}
        excludedUserIds={excludedUserIds}
        allowedUserIds={allowedUserIds}
        onSelect={(nextAudience, nextExcluded, nextAllowed) => {
          void handleAudienceSelect(nextAudience, nextExcluded, nextAllowed);
        }}
      />
    )}

    <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Báo cáo bài viết
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">Chọn lý do báo cáo bài viết này:</p>
          <div className="space-y-2">
            {REPORT_CATEGORIES.map((cat) => (
              <label
                key={cat.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedCategory === cat.value
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
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
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
              Mô tả thêm <span className="text-gray-400">(tuỳ chọn)</span>
            </label>
            <textarea
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
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
