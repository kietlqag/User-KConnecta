import { useNavigate } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import { UserAvatar } from '@/components/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Notification } from '../../types/notifications.types';

const SUPPORT_REPLY_PREFIX = 'Phản hồi yêu cầu hỗ trợ';

function parseSupportReply(text: string): { subject: string | null; body: string } | null {
  const match = text.match(/^Phản hồi yêu cầu hỗ trợ(?: «([^»]+)»)?: ([\s\S]+)$/);
  if (!match) return null;
  return { subject: match[1]?.trim() || null, body: match[2].trim() };
}

function formatFullDate(dateString: string): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

interface NotificationDetailDialogProps {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosePanel?: () => void;
}

export const NotificationDetailDialog = ({
  notification,
  open,
  onOpenChange,
  onClosePanel,
}: NotificationDetailDialogProps) => {
  const navigate = useNavigate();

  if (!notification) return null;

  const supportReply = notification.type === 'system' ? parseSupportReply(notification.text) : null;

  const handleGoSupport = () => {
    onOpenChange(false);
    onClosePanel?.();
    navigate('/support');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden z-[60]" aria-describedby={undefined}>
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle>Chi tiết thông báo</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={notification.user.name}
              avatarUrl={notification.user.avatar}
              userId={notification.user.id}
              rounded="full"
              className="h-12 w-12 shrink-0"
            />
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{notification.user.name}</p>
              <p className="text-xs text-muted-foreground">{formatFullDate(notification.timestamp)}</p>
            </div>
          </div>

          {supportReply ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <LifeBuoy className="h-4 w-4 shrink-0" />
                Phản hồi yêu cầu hỗ trợ
              </div>
              {supportReply.subject ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Tiêu đề yêu cầu</p>
                  <p className="text-sm font-medium text-foreground">{supportReply.subject}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Nội dung phản hồi</p>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{supportReply.body}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{notification.text}</p>
            </div>
          )}

          {supportReply ? (
            <Button variant="outline" className="w-full" onClick={handleGoSupport}>
              <LifeBuoy className="h-4 w-4 mr-2" />
              Gửi yêu cầu hỗ trợ mới
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
