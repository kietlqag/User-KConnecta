import { useState } from 'react';
import { ChevronRight, ClipboardList, Loader2 } from 'lucide-react';
import type { SupportRequestResponse } from '@/services/supportService';
import { SupportRequestDetailDialog } from './SupportRequestDetailDialog';
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_STYLES,
  formatSupportDateTime,
} from '../utils/supportLabels';

interface SupportRequestListProps {
  requests: SupportRequestResponse[];
  loading?: boolean;
}

export function SupportRequestList({ requests, loading }: SupportRequestListProps) {
  const [selectedRequest, setSelectedRequest] = useState<SupportRequestResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = (request: SupportRequestResponse) => {
    setSelectedRequest(request);
    setDetailOpen(true);
  };

  return (
    <>
      <div className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Yêu cầu đã gửi</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Xem lại các yêu cầu hỗ trợ và tiến trình xử lý.
          </p>
        </div>

        <div className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">Chưa có yêu cầu nào</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Các yêu cầu bạn gửi sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => openDetail(request)}
                  className="flex w-full items-start gap-3 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SUPPORT_STATUS_STYLES[request.status]}`}>
                        {SUPPORT_STATUS_LABELS[request.status]}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {SUPPORT_CATEGORY_LABELS[request.category]}
                      </span>
                    </div>
                    <p className="truncate text-sm font-semibold text-foreground">{request.subject}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{request.message}</p>
                    {request.attachmentUrls?.length > 0 && (
                      <p className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                        {request.attachmentUrls.length} ảnh minh chứng
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {formatSupportDateTime(request.createdAt)}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <SupportRequestDetailDialog
        request={selectedRequest}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
