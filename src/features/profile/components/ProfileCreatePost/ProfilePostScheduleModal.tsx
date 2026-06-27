import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clock, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

export type PostScheduleMode = 'now' | 'scheduled';

function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function defaultScheduledDatetimeLocal() {
  return toDatetimeLocalValue(new Date());
}

interface ProfilePostScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: PostScheduleMode;
  scheduledAtLocal: string;
  onConfirm: (payload: { mode: PostScheduleMode; scheduledAtLocal: string }) => void;
}

export function ProfilePostScheduleModal({
  isOpen,
  onClose,
  mode: initialMode,
  scheduledAtLocal: initialScheduledAtLocal,
  onConfirm,
}: ProfilePostScheduleModalProps) {
  const [mode, setMode] = useState<PostScheduleMode>(initialMode);
  const [scheduledAtLocal, setScheduledAtLocal] = useState(initialScheduledAtLocal);

  const minLocal = useMemo(() => toDatetimeLocalValue(new Date()), [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setScheduledAtLocal(
        initialScheduledAtLocal || (initialMode === 'scheduled' ? defaultScheduledDatetimeLocal() : ''),
      );
    }
  }, [isOpen, initialMode, initialScheduledAtLocal]);

  if (!isOpen) return null;

  const handleDone = () => {
    if (mode === 'scheduled') {
      if (!scheduledAtLocal.trim()) {
        toast.error('Chọn ngày và giờ đăng bài');
        return;
      }
      const chosen = new Date(scheduledAtLocal);
      if (Number.isNaN(chosen.getTime())) {
        toast.error('Thời gian không hợp lệ');
        return;
      }
      if (chosen.getTime() <= Date.now()) {
        toast.error('Chọn thời gian trong tương lai');
        return;
      }
      onConfirm({ mode: 'scheduled', scheduledAtLocal });
    } else {
      onConfirm({ mode: 'now', scheduledAtLocal: '' });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-[500px] overflow-y-auto rounded-lg bg-card shadow-xl">
        <div className="sticky top-0 relative flex items-center border-b border-border bg-card p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          <h2 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-foreground">
            Lựa chọn lịch đăng
          </h2>
        </div>

        <div className="p-4">
          <p className="mb-4 text-sm text-muted-foreground">
            Bạn có thể đăng bài ngay hoặc chọn thời điểm để bài viết được hiển thị sau.
          </p>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setMode('now')}
              className={`flex w-full items-center gap-3 rounded-lg p-3 transition-colors ${ mode === 'now' ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-muted' }`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${ mode === 'now' ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-muted' }`}
              >
                <Clock
                  className={`h-6 w-6 ${mode === 'now' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}
                />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-semibold text-foreground">Đăng ngay</h4>
                <p className="text-sm text-muted-foreground">Bài viết hiển thị ngay sau khi đăng</p>
              </div>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${ mode === 'now' ? 'border-emerald-600 dark:border-emerald-400' : 'border-gray-400 dark:border-gray-500' }`}
              >
                {mode === 'now' && <div className="h-3 w-3 rounded-full bg-emerald-600 dark:bg-emerald-400" />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('scheduled');
                if (!scheduledAtLocal) setScheduledAtLocal(toDatetimeLocalValue(new Date()));
              }}
              className={`flex w-full items-center gap-3 rounded-lg p-3 transition-colors ${ mode === 'scheduled' ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-muted' }`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${ mode === 'scheduled' ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-muted' }`}
              >
                <CalendarClock
                  className={`h-6 w-6 ${ mode === 'scheduled' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground' }`}
                />
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-semibold text-foreground">Đặt lịch đăng</h4>
                <p className="text-sm text-muted-foreground">Chọn ngày và giờ đăng bài</p>
              </div>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${ mode === 'scheduled' ? 'border-emerald-600 dark:border-emerald-400' : 'border-gray-400 dark:border-gray-500' }`}
              >
                {mode === 'scheduled' && <div className="h-3 w-3 rounded-full bg-emerald-600 dark:bg-emerald-400" />}
              </div>
            </button>

            {mode === 'scheduled' && (
              <div className="rounded-lg border border-border bg-muted p-3/40">
                <label htmlFor="post-schedule-at" className="mb-2 block text-sm font-medium text-foreground">
                  Thời gian đăng
                </label>
                <input
                  id="post-schedule-at"
                  type="datetime-local"
                  min={minLocal}
                  value={scheduledAtLocal}
                  onChange={(e) => setScheduledAtLocal(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground dark:text-white"
                />
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-card p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-6 py-2 font-semibold text-emerald-600 transition-colors hover:bg-background dark:text-emerald-400"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="rounded-lg bg-emerald-500 px-6 py-2 font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
