import { Check } from 'lucide-react';
import type { SupportRequestResponse } from '@/services/supportService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_PROGRESS_STEPS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_STYLES,
  formatSupportDateTime,
  getSupportStatusIndex,
} from '../utils/supportLabels';

interface SupportRequestDetailDialogProps {
  request: SupportRequestResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportRequestDetailDialog({
  request,
  open,
  onOpenChange,
}: SupportRequestDetailDialogProps) {
  if (!request) return null;

  const currentStep = getSupportStatusIndex(request.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-6 text-left text-lg font-bold text-foreground">
            {request.subject}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">
              {SUPPORT_CATEGORY_LABELS[request.category]}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${SUPPORT_STATUS_STYLES[request.status]}`}>
              {SUPPORT_STATUS_LABELS[request.status]}
            </span>
            <span className="text-muted-foreground">{formatSupportDateTime(request.createdAt)}</span>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">Tiến trình xử lý</p>
            <div className="space-y-3">
              {SUPPORT_PROGRESS_STEPS.map((step, index) => {
                const isDone = index <= currentStep;
                const isCurrent = index === currentStep;
                return (
                  <div key={step.status} className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                        isDone
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-border bg-background text-muted-foreground'
                      }`}
                    >
                      {isDone ? <Check className="h-4 w-4" /> : <span className="text-xs font-semibold">{index + 1}</span>}
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className={`text-sm font-medium ${isCurrent ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {request.status === 'PENDING' && 'Yêu cầu của bạn đã được gửi và đang chờ quản trị viên tiếp nhận.'}
                          {request.status === 'IN_PROGRESS' && 'Quản trị viên đang xem xét và xử lý yêu cầu của bạn.'}
                          {request.status === 'RESOLVED' && 'Yêu cầu đã được xử lý. Kiểm tra thông báo để xem phản hồi.'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Nội dung yêu cầu</p>
            <p className="whitespace-pre-wrap rounded-lg bg-muted px-3 py-3 text-sm text-foreground">
              {request.message}
            </p>
          </div>

          {request.attachmentUrls?.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">Ảnh minh chứng</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {request.attachmentUrls.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    <img src={url} alt="Ảnh minh chứng" className="aspect-square w-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Khi yêu cầu được giải quyết, quản trị viên sẽ phản hồi qua thông báo trên ứng dụng.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
