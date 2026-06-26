import { Bell, Calendar, Globe, Loader2, Pencil, Trash2, UserRound, Users2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import {
  liveService,
  type LiveEventSubscriberResponse,
  type LiveSessionResponse,
} from '@/services/liveService';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  formatScheduledDisplayFromIso,
  isScheduledAtInFuture,
  isScheduledSessionDue,
  mapPrivacyToPostApi,
  normalizeScheduledAtForApi,
} from '../../utils/liveFormUtils';
import { startScheduledLiveAndNavigate } from '../../utils/navigateToLiveSession';

type PrivacyChoice = 'PUBLIC' | 'FRIENDS' | 'ONLY_ME';

const privacyLabels: Record<PrivacyChoice, string> = {
  PUBLIC: 'Công khai',
  FRIENDS: 'Bạn bè',
  ONLY_ME: 'Chỉ mình tôi',
};

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function mapPrivacyFromApi(privacy: LiveSessionResponse['privacy']): PrivacyChoice {
  if (privacy === 'PRIVATE') return 'ONLY_ME';
  if (privacy === 'FRIENDS' || privacy === 'FRIENDS_EXCEPT' || privacy === 'SPECIFIC_FRIENDS') return 'FRIENDS';
  return 'PUBLIC';
}

interface ScheduledLiveDetailDialogProps {
  session: LiveSessionResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (session: LiveSessionResponse) => void;
  onDeleted: (sessionId: string) => void;
  /** Hide subscribe CTA when interest is shown on the parent surface (e.g. group event card). */
  hideSubscribeButton?: boolean;
}

export function ScheduledLiveDetailDialog({
  session,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  hideSubscribeButton = false,
}: ScheduledLiveDetailDialogProps) {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const isOwner = !!currentUser && !!session && currentUser.id === session.hostUserId;

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyChoice>('PUBLIC');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubscribeLoading, setIsSubscribeLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [subscribers, setSubscribers] = useState<LiveEventSubscriberResponse[]>([]);
  const [isSubscribersLoading, setIsSubscribersLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const minScheduledAt = useMemo(
    () => new Date(Date.now() + 60_000).toISOString().slice(0, 16),
    [],
  );

  useEffect(() => {
    if (!open || !session) return;
    setMode('view');
    setTitle(session.title?.trim() || '');
    setDescription(session.description?.trim() || '');
    setScheduledAt(toDatetimeLocalValue(session.scheduledAt));
    setPrivacy(mapPrivacyFromApi(session.privacy));
    setIsSubscribed(Boolean(session.subscribedByCurrentUser));
    setSubscriptionCount(session.subscriptionCount ?? 0);
  }, [open, session]);

  useEffect(() => {
    if (!open || !session?.id || !isOwner) {
      setSubscribers([]);
      return;
    }
    let cancelled = false;
    setIsSubscribersLoading(true);
    liveService.getEventSubscribers(session.id)
      .then((result) => {
        if (cancelled) return;
        setSubscribers(result.subscribers);
        setSubscriptionCount(result.total);
      })
      .catch(() => {
        if (!cancelled) setSubscribers([]);
      })
      .finally(() => {
        if (!cancelled) setIsSubscribersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, session?.id, isOwner]);

  if (!session) return null;

  const scheduledLabel = formatScheduledDisplayFromIso(session.scheduledAt);
  const canStartScheduledLive = isScheduledSessionDue(session.scheduledAt);
  const isTitleValid = title.trim().length >= 5;
  const isDescriptionValid = description.trim().length >= 10;
  const isTimeValid = isScheduledAtInFuture(scheduledAt);
  const canSave = isTitleValid && isDescriptionValid && isTimeValid;

  const handleSave = async () => {
    if (!canSave || isSaving) return;
    const normalizedScheduledAt = normalizeScheduledAtForApi(scheduledAt);
    if (!normalizedScheduledAt) return;
    setIsSaving(true);
    try {
      const updated = await liveService.updateScheduledSession(session.id, {
        title: title.trim(),
        description: description.trim(),
        scheduledAt: normalizedScheduledAt,
        privacy: mapPrivacyToPostApi(privacy),
      });
      onUpdated(updated);
      setMode('view');
      toast.success('Đã cập nhật sự kiện live');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật sự kiện');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await liveService.cancelScheduledSession(session.id);
      onDeleted(session.id);
      setConfirmDeleteOpen(false);
      onOpenChange(false);
      toast.success('Đã xóa sự kiện live');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa sự kiện');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleSubscription = async () => {
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để đặt nhắc nhở');
      return;
    }
    setIsSubscribeLoading(true);
    try {
      const result = isSubscribed
        ? await liveService.unsubscribeFromEvent(session.id)
        : await liveService.subscribeToEvent(session.id);
      setIsSubscribed(result.subscribed);
      setSubscriptionCount(result.subscriptionCount);
      toast.success(result.subscribed ? 'Đã đặt nhắc nhở cho buổi live' : 'Đã bỏ quan tâm');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật nhắc nhở');
    } finally {
      setIsSubscribeLoading(false);
    }
  };

  const handleStartLive = async () => {
    try {
      await startScheduledLiveAndNavigate(session, navigate);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể bắt đầu phát');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-xl flex-col overflow-hidden p-0">
          <div className="shrink-0 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? 'Chỉnh sửa sự kiện live' : 'Chi tiết sự kiện live'}</DialogTitle>
            <DialogDescription className="sr-only">Thông tin buổi phát trực tiếp theo lịch</DialogDescription>
          </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4 sidebar-scrollbar">
          <section className="space-y-4">
              {mode === 'view' ? (
                <>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tên sự kiện</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{session.title}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Mô tả</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">{session.description || '—'}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-emerald-600" />
                      <span>{scheduledLabel || 'Chưa có thời gian'}</span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      {privacy === 'PUBLIC' ? <Globe className="h-4 w-4" /> : privacy === 'FRIENDS' ? <Users2 className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
                      <span>{privacyLabels[privacy]}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Tên sự kiện</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Mô tả</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={5}
                      className="w-full resize-none rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Thời gian bắt đầu</label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      min={minScheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Quyền riêng tư</label>
                    <select
                      value={privacy}
                      onChange={(e) => setPrivacy(e.target.value as PrivacyChoice)}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="PUBLIC">Công khai</option>
                      <option value="FRIENDS">Bạn bè</option>
                      <option value="ONLY_ME">Chỉ mình tôi</option>
                    </select>
                  </div>
                </>
              )}
          </section>

          {isOwner && (
            <section className="mt-2 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Người quan tâm ({subscriptionCount})</h4>
              </div>
              {isSubscribersLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : subscribers.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">Chưa có ai quan tâm sự kiện này.</p>
              ) : (
                <div className="max-h-52 overflow-y-auto overscroll-contain rounded-lg border border-gray-100 bg-gray-50 pr-1 dark:border-gray-800 dark:bg-gray-900/60 sidebar-scrollbar">
                  <div className="space-y-1 p-1">
                    {subscribers.map((subscriber) => (
                      <button
                        key={subscriber.userId}
                        type="button"
                        onClick={() => {
                          onOpenChange(false);
                          navigate(`/profile/${subscriber.userId}`);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted"
                      >
                        <ImageWithFallback
                          src={subscriber.avatarUrl || ''}
                          alt={subscriber.fullName || subscriber.username}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {subscriber.fullName || subscriber.username}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">@{subscriber.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          </div>

          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
            <div className="flex flex-wrap gap-2">
              {isOwner ? (
                mode === 'view' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setMode('edit')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Pencil className="h-4 w-4" />
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Xóa
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setMode('view')}
                      className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={!canSave || isSaving}
                      onClick={() => void handleSave()}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </>
                )
              ) : !hideSubscribeButton ? (
                <button
                  type="button"
                  disabled={isSubscribeLoading}
                  onClick={() => void handleToggleSubscription()}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold ${
                    isSubscribed
                      ? 'border border-green-600 bg-green-50 text-green-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <Bell className="h-4 w-4" />
                  {isSubscribeLoading ? 'Đang lưu...' : isSubscribed ? 'Đã quan tâm' : 'Quan tâm'}
                </button>
              ) : null}
            </div>

            {isOwner && mode === 'view' && (
              <button
                type="button"
                disabled={!canStartScheduledLive}
                onClick={() => void handleStartLive()}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                  canStartScheduledLive
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'cursor-not-allowed bg-gray-400'
                }`}
              >
                {canStartScheduledLive ? 'Bắt đầu phát' : 'Chưa đến giờ'}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa sự kiện live?</AlertDialogTitle>
            <AlertDialogDescription>
              Bài thông báo và lịch phát sẽ bị xóa. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Đang xóa...' : 'Xóa sự kiện'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
