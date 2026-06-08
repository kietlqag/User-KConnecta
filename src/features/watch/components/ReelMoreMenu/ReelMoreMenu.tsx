import { useEffect, useState } from 'react';
import { MoreHorizontal, Link2, Bookmark, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { authService } from '@/services/authService';
import { postService, SAVED_POSTS_CHANGED_EVENT } from '@/services/postService';

interface ReelMoreMenuProps {
  postId: string;
  isSaved?: boolean;
  isOwner?: boolean;
}

export function ReelMoreMenu({ postId, isSaved: initialSaved = false, isOwner = false }: ReelMoreMenuProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    setIsSaved(initialSaved);
  }, [initialSaved, postId]);

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
    setReportDialogOpen(true);
  };

  const handleReportVideo = async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || reporting) return;

    setReporting(true);
    try {
      await postService.reportPost(postId, currentUser.id, 'reported-from-watch-menu');
      setReportDialogOpen(false);
      toast.success('Đã gửi báo cáo video tới quản trị viên');
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Không thể báo cáo video. Vui lòng thử lại.';
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
            className="flex flex-col items-center gap-1 group transition-transform hover:scale-110 cursor-pointer outline-none"
            aria-label="Tùy chọn khác"
          >
            <div className="w-12 h-12 rounded-full bg-gray-800/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-gray-600 transition-colors">
              <MoreHorizontal className="w-6 h-6 text-white" />
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
              className={`h-5 w-5 shrink-0 ${isSaved ? 'fill-blue-400 text-blue-400' : 'text-gray-300'}`}
            />
            <span className="font-medium">{isSaved ? 'Bỏ lưu video' : 'Lưu video'}</span>
          </DropdownMenuItem>

          {!isOwner && (
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-red-400 focus:bg-red-950/50 focus:text-red-300"
              disabled={reporting}
              onClick={handleOpenReportDialog}
            >
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="font-medium">Báo cáo video</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <AlertDialogContent className="border border-gray-200 bg-white sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Báo cáo video</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn báo cáo video này? Quản trị viên sẽ xem xét nội dung vi phạm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer" disabled={reporting}>
              Không
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-red-600 text-white hover:bg-red-700"
              disabled={reporting}
              onClick={(event) => {
                event.preventDefault();
                void handleReportVideo();
              }}
            >
              {reporting ? 'Đang gửi...' : 'Có'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
