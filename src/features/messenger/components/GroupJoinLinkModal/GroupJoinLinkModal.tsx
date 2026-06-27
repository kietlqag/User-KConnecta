import { useEffect, useState } from 'react';
import { Users, X } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { toast } from 'sonner';
import { chatService, type GroupJoinLinkPreviewResponse } from '@/services/chatService';

interface GroupJoinLinkModalProps {
  token: string;
  onClose: () => void;
  onJoined: (conversationId: string) => void;
  onOpenGroup: (conversationId: string) => void;
}

export function GroupJoinLinkModal({ token, onClose, onJoined, onOpenGroup }: GroupJoinLinkModalProps) {
  const [preview, setPreview] = useState<GroupJoinLinkPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void chatService
      .previewGroupJoinLink(token)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setPreview(null);
          setError(err instanceof Error ? err.message : 'Không thể tải thông tin nhóm.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const groupName = preview?.conversationName || 'Nhóm chat';
  const groupAvatar = preview?.avatarUrl?.trim() || '';

  const handlePrimaryAction = async () => {
    if (!preview) return;

    if (preview.membershipStatus === 'MEMBER') {
      onOpenGroup(preview.conversationId);
      onClose();
      return;
    }

    if (preview.membershipStatus === 'PENDING') {
      onClose();
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await chatService.joinGroupViaLink(token);
      if (result.status === 'JOINED' || result.status === 'ALREADY_MEMBER') {
        onJoined(result.conversationId);
        onClose();
        return;
      }
      toast.info(result.message);
      setPreview((prev) =>
        prev
          ? {
              ...prev,
              membershipStatus: 'PENDING',
              conversationName: result.conversationName || prev.conversationName,
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tham gia nhóm.');
    } finally {
      setSubmitting(false);
    }
  };

  const primaryLabel = (() => {
    if (!preview) return 'Tham gia nhóm';
    if (preview.membershipStatus === 'MEMBER') return 'Mở nhóm chat';
    if (preview.membershipStatus === 'PENDING') return 'Đang chờ duyệt';
    return preview.memberApprovalRequired ? 'Gửi yêu cầu tham gia' : 'Tham gia nhóm';
  })();

  const primaryDisabled =
    loading || submitting || !preview || preview.membershipStatus === 'PENDING' || Boolean(error && !preview);

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-lg font-bold text-foreground">Tham gia nhóm chat</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted dark:text-muted-foreground cursor-pointer"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-6 text-center">
          {loading ? (
            <p className="text-sm text-muted-foreground">Đang tải thông tin nhóm...</p>
          ) : error && !preview ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : preview ? (
            <>
              <UserAvatar name={groupName} avatarUrl={groupAvatar} variant="group" rounded="full" className="mx-auto h-20 w-20" />
              <h4 className="mt-4 text-xl font-bold text-foreground">{preview.conversationName}</h4>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {preview.memberCount} thành viên
              </p>
              {preview.memberApprovalRequired && preview.membershipStatus === 'NONE' && (
                <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                  Nhóm yêu cầu quản trị viên phê duyệt trước khi tham gia.
                </p>
              )}
              {preview.membershipStatus === 'PENDING' && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Yêu cầu tham gia của bạn đang chờ quản trị viên duyệt.
                </p>
              )}
              {preview.membershipStatus === 'MEMBER' && (
                <p className="mt-3 text-sm text-muted-foreground">Bạn đã là thành viên của nhóm này.</p>
              )}
              {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            </>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-foreground hover:bg-muted cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={primaryDisabled}
            onClick={() => void handlePrimaryAction()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-muted dark:disabled:bg-gray-600 cursor-pointer"
          >
            {submitting ? 'Đang xử lý...' : primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
