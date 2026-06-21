import { CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeedErrorStateProps {
  onRetry: () => void;
  isRetrying?: boolean;
  detail?: string | null;
}

export function FeedErrorState({ onRetry, isRetrying = false, detail }: FeedErrorStateProps) {
  return (
    <div
      role="alert"
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="px-6 py-10 text-center sm:px-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <CloudOff className="h-8 w-8 text-muted-foreground" aria-hidden />
        </div>

        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Không thể tải bảng tin
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
          Có thể do mạng chậm hoặc máy chủ đang bận. Bài viết mới sẽ hiện ở đây khi kết nối ổn định.
        </p>

        {detail ? (
          <p className="mx-auto mt-3 max-w-md truncate text-xs text-muted-foreground/80" title={detail}>
            {detail}
          </p>
        ) : null}

        <Button
          type="button"
          variant="default"
          className="mt-6 min-w-[140px] gap-2"
          onClick={onRetry}
          disabled={isRetrying}
        >
          <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} aria-hidden />
          {isRetrying ? 'Đang thử lại…' : 'Thử lại'}
        </Button>
      </div>
    </div>
  );
}
