import { useEffect, useState } from 'react';
import { MoreHorizontal, Link2, Bookmark, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { reelActionIconClass } from '../ReelActionButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/authService';
import { postService, SAVED_POSTS_CHANGED_EVENT, type ReportCategory } from '@/services/postService';

const REPORT_CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: 'SPAM',           label: 'Spam / Quảng cáo' },
  { value: 'VIOLENCE',       label: 'Bạo lực' },
  { value: 'HATE_SPEECH',    label: 'Ngôn ngữ thù địch' },
  { value: 'NUDITY',         label: 'Nội dung khiêu dâm' },
  { value: 'MISINFORMATION', label: 'Thông tin sai lệch' },
  { value: 'OTHER',          label: 'Lý do khác' },
];

interface ReelMoreMenuProps {
  postId: string;
  isSaved?: boolean;
  isOwner?: boolean;
}

export function ReelMoreMenu({ postId, isSaved: initialSaved = false, isOwner = false }: ReelMoreMenuProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [hasReported, setHasReported] = useState(false);
  const [reportStatusLoading, setReportStatusLoading] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    setIsSaved(initialSaved);
  }, [initialSaved, postId]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!postId || isOwner || !currentUser) {
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
  }, [postId, isOwner]);

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/watch?id=${postId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Đã sao chép liên kết vào bộ nhớ tạm');
    } catch {
      toast.error('Không thể sao chép liên kết');
    }
  };

  const handleToggleSave = async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để lưu video');
      return;
    }

    setSaving(true);
    try {
      if (isSaved) {
        await postService.unsavePost(currentUser.id, postId);
        setIsSaved(false);
        toast.success('Đã bỏ lưu video');
        window.dispatchEvent(
          new CustomEvent(SAVED_POSTS_CHANGED_EVENT, { detail: { postId, saved: false } }),
        );
      } else {
        await postService.savePost(currentUser.id, postId);
        setIsSaved(true);
        toast.success('Đã lưu video vào danh sách mục đã lưu');
        window.dispatchEvent(
          new CustomEvent(SAVED_POSTS_CHANGED_EVENT, { detail: { postId, saved: true } }),
        );
      }
    } catch {
      toast.error('Không thể thực hiện thao tác. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenReportDialog = () => {
    if (!authService.getCurrentUser()) {
      toast.error('Vui lòng đăng nhập để báo cáo video');
      return;
    }
    if (hasReported) {
      toast.info('Bạn đã báo cáo video này rồi');
      return;
    }
    setSelectedCategory(null);
    setReportReason('');
    setReportDialogOpen(true);
  };

  const handleReportVideo = async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || reporting || !selectedCategory || hasReported) return;

    setReporting(true);
    try {
      await postService.reportPost(postId, currentUser.id, selectedCategory, reportReason);
      setHasReported(true);
      setReportDialogOpen(false);
      toast.success('Đã gửi báo cáo video tới quản trị viên');
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Không thể báo cáo video. Vui lòng thử lại.';
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex flex-col items-center gap-1.5 outline-none"
            aria-label="Tùy chọn khác"
          >
            <div className={reelActionIconClass}>
              <MoreHorizontal className="h-5 w-5" strokeWidth={2.25} />
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="left"
          align="center"
          className="z-[80] w-64 rounded-xl border-gray-700 bg-gray-900 p-1 text-white shadow-xl"
        >
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-white focus:bg-gray-800 focus:text-white"
            onClick={() => void handleCopyLink()}
          >
            <Link2 className="h-5 w-5 shrink-0 text-gray-300" />
            <span className="font-medium">Sao chép liên kết</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-white focus:bg-gray-800 focus:text-white"
            disabled={saving}
            onClick={() => void handleToggleSave()}
          >
            <Bookmark
              className={`h-5 w-5 shrink-0 ${isSaved ? 'fill-emerald-400 text-emerald-400' : 'text-gray-300'}`}
            />
            <span className="font-medium">{isSaved ? 'Bỏ lưu video' : 'Lưu video'}</span>
          </DropdownMenuItem>

          {!isOwner && (
            <DropdownMenuItem
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                hasReported
                  ? 'cursor-default text-gray-500 focus:bg-transparent focus:text-gray-500'
                  : 'cursor-pointer text-red-400 focus:bg-red-950/50 focus:text-red-300'
              }`}
              disabled={reporting || reportStatusLoading || hasReported}
              onClick={() => {
                if (hasReported) {
                  toast.info('Bạn đã báo cáo video này rồi');
                  return;
                }
                handleOpenReportDialog();
              }}
            >
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="font-medium">
                {hasReported ? 'Đã báo cáo video' : 'Báo cáo video'}
              </span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Báo cáo video
            </DialogTitle>
            <DialogDescription>Chọn lý do báo cáo video này</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
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
              onClick={() => void handleReportVideo()}
            >
              {reporting ? 'Đang gửi...' : 'Gửi báo cáo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
