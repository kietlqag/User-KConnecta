import React, { useEffect, useRef, useState } from 'react';
import {
  MoreHorizontal,
  Bookmark,
  Trash2,
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
import { postService, type ReportCategory } from '@/services/postService';
import type { PostPrivacy } from '@/features/profile/components/ProfileCreatePost/postAudienceUtils';
import { getScrollTop, runWithPreservedScroll, setScrollTop } from '@/features/home/utils/scrollToHomeTop';

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
  isGroupPost?: boolean;
  currentUserId?: string;
  onToggleSave?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
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
  isGroupPost = false,
  currentUserId,
  onToggleSave,
  onEdit,
  onDelete,
  canPin = false,
  isPinned = false,
  onPin,
  onUnpin,
  className,
}) => {
  const [reporting, setReporting] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [reportStatusLoading, setReportStatusLoading] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  const runAfterMenuClose = (action?: () => void) => {
    if (!action) return;
    const scrollY = getScrollTop();
    setMenuOpen(false);
    window.setTimeout(() => {
      setScrollTop(scrollY);
      runWithPreservedScroll(action);
    }, 0);
  };

  useEffect(() => {
    if (!postId || isOwner || !currentUserId) {
      setHasReported(false);
      return;
    }

    let cancelled = false;
    setReportStatusLoading(true);
    void postService
      .getPostReportStatus(postId)
      .then((status) => {
        if (!cancelled) setHasReported(Boolean(status.reported));
      })
      .catch(() => {
        if (!cancelled) setHasReported(false);
      })
      .finally(() => {
        if (!cancelled) setReportStatusLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [postId, isOwner, currentUserId]);

  const handleOpenReportDialog = () => {
    if (!currentUserId) {
      toast.error('Vui lòng đăng nhập để báo cáo bài viết.');
      return;
    }
    if (hasReported) return;
    setSelectedCategory(null);
    setReportReason('');
    runAfterMenuClose(() => setReportDialogOpen(true));
  };

  const handleReportPost = async () => {
    if (reporting || !currentUserId || !selectedCategory || hasReported) return;

    setReporting(true);
    try {
      await postService.reportPost(postId, currentUserId, selectedCategory, reportReason);
      setHasReported(true);
      setReportDialogOpen(false);
      toast.success('Đã gửi báo cáo bài viết tới quản trị viên.');
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Không thể báo cáo bài viết. Vui lòng thử lại.';
      if (message.includes('đã báo cáo')) {
        setHasReported(true);
        setReportDialogOpen(false);
      }
      toast.error(message);
    } finally {
      setReporting(false);
    }
  };

  return (
    <>
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          ref={menuTriggerRef}
          type="button"
          className={`p-2 hover:bg-muted rounded-full transition-colors cursor-pointer ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 p-2"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          menuTriggerRef.current?.focus({ preventScroll: true });
        }}
      >
        {canPin && (
          <>
            <DropdownMenuItem
              className="flex items-start gap-3 p-3 cursor-pointer"
              onClick={isPinned ? onUnpin : onPin}
            >
              <div className="mt-1">
                <Pin className={`w-6 h-6 ${isPinned ? 'text-emerald-600 fill-emerald-600' : 'text-foreground'}`} />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[15px]">{isPinned ? 'Bỏ ghim bài viết' : 'Ghim bài viết'}</span>
                <span className="text-[13px] text-muted-foreground">
                  {isPinned ? 'Gỡ khỏi khu bài viết nổi bật của nhóm.' : 'Đưa lên khu bài viết nổi bật của nhóm.'}
                </span>
              </div>
            </DropdownMenuItem>
            <div className="my-1 border-t border-border" />
          </>
        )}
        {!isOwner && (
          <>
            <DropdownMenuItem
              className={`flex items-start gap-3 p-3 ${ hasReported ? 'cursor-default text-muted-foreground focus:bg-transparent focus:text-muted-foreground' : 'cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50' }`}
              disabled={reporting || reportStatusLoading || hasReported}
              onSelect={(e) => {
                e.preventDefault();
                if (hasReported) return;
                handleOpenReportDialog();
              }}
            >
              <div className="mt-1">
                <AlertTriangle className={`w-6 h-6 ${hasReported ? 'text-muted-foreground' : ''}`} />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[15px]">
                  {hasReported ? 'Đã báo cáo bài viết' : 'Báo cáo bài viết'}
                </span>
                <span className={`text-[13px] ${hasReported ? 'text-muted-foreground' : 'text-red-400'}`}>
                  {hasReported
                    ? 'Đã gửi báo cáo cho quản trị viên xem xét.'
                    : 'Gửi bài viết này cho quản trị viên xem xét.'}
                </span>
              </div>
            </DropdownMenuItem>

            <div className="my-1 border-t border-border" />
          </>
        )}

        <DropdownMenuItem
          className="flex items-start gap-3 p-3 cursor-pointer"
          onClick={onToggleSave}
        >
          <div className="mt-1">
            <Bookmark className={`w-6 h-6 ${isSaved ? 'text-emerald-600 fill-emerald-600' : 'text-foreground fill-gray-900'}`} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[15px]">{isSaved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}</span>
            <span className="text-[13px] text-muted-foreground">
              {isSaved ? 'Xóa khỏi danh sách mục đã lưu.' : 'Thêm vào danh sách mục đã lưu.'}
            </span>
          </div>
        </DropdownMenuItem>

        {isOwner && (
          <>
            <div className="my-1 border-t border-border" />

            {onEdit && (
              <DropdownMenuItem
                className="flex items-start gap-3 p-3 cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault();
                  runAfterMenuClose(onEdit);
                }}
              >
                <div className="mt-1">
                  <Pencil className="w-6 h-6 text-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-[15px]">Chỉnh sửa</span>
                  <span className="text-[13px] text-muted-foreground">
                    {isGroupPost
                      ? 'Thay đổi nội dung bài viết.'
                      : 'Thay đổi nội dung và quyền riêng tư.'}
                  </span>
                </div>
              </DropdownMenuItem>
            )}

            <div className="my-1 border-t border-border" />

            <DropdownMenuItem
              className="flex items-start gap-3 p-3 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              onSelect={(e) => {
                e.preventDefault();
                runAfterMenuClose(onDelete);
              }}
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
          <p className="text-sm text-muted-foreground">Chọn lý do báo cáo bài viết này:</p>
          <div className="space-y-2">
            {REPORT_CATEGORIES.map((cat) => (
              <label
                key={cat.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${ selectedCategory === cat.value ? 'border-red-400 bg-red-50' : 'border-border hover:bg-muted' }`}
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
            <label className="text-sm text-muted-foreground mb-1 block">
              Mô tả thêm <span className="text-muted-foreground">(tuỳ chọn)</span>
            </label>
            <textarea
              className="w-full rounded-md border border-border p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
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
