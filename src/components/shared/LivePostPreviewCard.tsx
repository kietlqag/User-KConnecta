import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Lock, Play, Radio } from 'lucide-react';
import { Room, RoomEvent, Track, type RemoteTrack } from 'livekit-client';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { liveService, type LiveEventSubscriberResponse, type LiveSessionResponse } from '@/services/liveService';
import { isSessionHost, navigateToLiveSession, startScheduledLiveAndNavigate } from '@/features/live/utils/navigateToLiveSession';
import { formatScheduledDisplayFromIso, isScheduledSessionDue } from '@/features/live/utils/liveFormUtils';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const isPlayableUrl = (value?: string | null) => /^https?:\/\//i.test(value?.trim() ?? '');
const LIVE_PREVIEW_ACTIVE_EVENT = 'kconnecta.livePreviewActive';

interface LivePostPreviewCardProps {
  postId: string;
  authorId: string;
  content: string;
  /** Connect preview immediately (e.g. inside comment modal). */
  alwaysActive?: boolean;
  /** Hide bottom action bar; keep video frame. */
  compact?: boolean;
  className?: string;
}

export function LivePostPreviewCard({
  postId,
  authorId,
  content,
  alwaysActive = false,
  compact = false,
  className = '',
}: LivePostPreviewCardProps) {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const isOwner = !!currentUser && currentUser.id === authorId;

  const livePreviewRootRef = useRef<HTMLButtonElement | null>(null);
  const livePreviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const livePreviewRoomRef = useRef<Room | null>(null);
  const livePreviewConnectingRef = useRef(false);

  const [liveSessionStatus, setLiveSessionStatus] = useState<'LIVE' | 'ENDED' | 'CANCELED' | 'SCHEDULED' | null>(null);
  const [liveSession, setLiveSession] = useState<LiveSessionResponse | null>(null);
  const [isLiveSubscribed, setIsLiveSubscribed] = useState(false);
  const [liveSubscriptionCount, setLiveSubscriptionCount] = useState(0);
  const [isSubscribeLoading, setIsSubscribeLoading] = useState(false);
  const [isSubscribersOpen, setIsSubscribersOpen] = useState(false);
  const [isSubscribersLoading, setIsSubscribersLoading] = useState(false);
  const [eventSubscribers, setEventSubscribers] = useState<LiveEventSubscriberResponse[]>([]);
  const [isLivePreviewReady, setIsLivePreviewReady] = useState(false);
  const [isLivePreviewConnecting, setIsLivePreviewConnecting] = useState(false);

  const isLiveEnded = liveSessionStatus === 'ENDED' || liveSessionStatus === 'CANCELED';
  const [liveTitle, liveDescription] = useMemo(() => {
    const [title, ...rest] = (content || '').split(/\n\s*\n/);
    return [title?.trim() || 'Video trực tiếp', rest.join('\n\n').trim()];
  }, [content]);
  const liveReplayUrl = isLiveEnded && isPlayableUrl(liveSession?.playbackUrl) ? liveSession?.playbackUrl?.trim() : '';
  const isRecordingProcessing = isLiveEnded && liveSession?.recordingStatus === 'PROCESSING' && !liveReplayUrl;
  const isRecordingFailed = isLiveEnded && liveSession?.recordingStatus === 'FAILED' && !liveReplayUrl;
  const scheduledLiveAt = liveSessionStatus === 'SCHEDULED' && liveSession?.scheduledAt
    ? formatScheduledDisplayFromIso(liveSession.scheduledAt)
    : '';
  const canStartScheduledLive = isScheduledSessionDue(liveSession?.scheduledAt);
  const isScheduledLockedForHost = Boolean(scheduledLiveAt && isOwner && !canStartScheduledLive);
  const showLiveVideo = Boolean(
    (liveSessionStatus === 'LIVE' && (isLivePreviewReady || isLivePreviewConnecting))
    || liveReplayUrl,
  );
  const showLivePlaceholder = liveSessionStatus === 'LIVE' && !isLivePreviewReady && !isLivePreviewConnecting;

  useEffect(() => {
    let cancelled = false;
    const loadLiveStatus = async () => {
      try {
        const session = await liveService.getSessionByPost(postId);
        if (!cancelled) {
          setLiveSession(session);
          setLiveSessionStatus(session.status);
          setIsLiveSubscribed(Boolean(session.subscribedByCurrentUser));
          setLiveSubscriptionCount(session.subscriptionCount ?? 0);
        }
      } catch {
        if (!cancelled) {
          setLiveSession(null);
          setLiveSessionStatus(null);
        }
      }
    };
    void loadLiveStatus();
    const interval = window.setInterval(() => void loadLiveStatus(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [postId]);

  useEffect(() => {
    if (liveSessionStatus !== 'LIVE' || !currentUser?.id) return;
    const root = livePreviewRootRef.current;
    if (!alwaysActive && !root) return;

    let cancelled = false;
    let room: Room | null = null;

    const disconnectPreview = () => {
      room?.disconnect();
      room = null;
      livePreviewRoomRef.current = null;
      livePreviewConnectingRef.current = false;
      setIsLivePreviewReady(false);
      setIsLivePreviewConnecting(false);
      if (livePreviewVideoRef.current) {
        livePreviewVideoRef.current.srcObject = null;
      }
    };

    const attachTrack = (track: RemoteTrack) => {
      if (track.kind !== Track.Kind.Video || !livePreviewVideoRef.current) return;
      track.attach(livePreviewVideoRef.current);
      setIsLivePreviewReady(true);
      setIsLivePreviewConnecting(false);
    };

    const attachExistingTracks = (activeRoom: Room) => {
      activeRoom.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => {
          if (publication.track) {
            attachTrack(publication.track as RemoteTrack);
          }
        });
      });
    };

    const connectPreview = async () => {
      if (room || cancelled || livePreviewConnectingRef.current) return;
      livePreviewConnectingRef.current = true;
      setIsLivePreviewConnecting(true);
      try {
        const session = liveSession?.status === 'LIVE' ? liveSession : await liveService.getSessionByPost(postId);
        if (cancelled || session.status !== 'LIVE') {
          livePreviewConnectingRef.current = false;
          setIsLivePreviewConnecting(false);
          return;
        }
        const token = await liveService.getToken({ sessionId: session.id, userId: currentUser.id, role: 'VIEWER' });
        if (cancelled) return;
        const nextRoom = new Room();
        room = nextRoom;
        livePreviewRoomRef.current = nextRoom;
        window.dispatchEvent(new CustomEvent(LIVE_PREVIEW_ACTIVE_EVENT, { detail: { postId, sessionId: session.id } }));
        nextRoom.on(RoomEvent.TrackSubscribed, attachTrack);
        await nextRoom.connect(token.livekitUrl, token.token);
        if (cancelled) return;
        attachExistingTracks(nextRoom);
      } catch {
        disconnectPreview();
      }
    };

    const handleOtherPreview = (event: Event) => {
      const detail = (event as CustomEvent<{ postId?: string }>).detail;
      if (detail?.postId && detail.postId !== postId) {
        disconnectPreview();
      }
    };
    window.addEventListener(LIVE_PREVIEW_ACTIVE_EVENT, handleOtherPreview);

    let observer: IntersectionObserver | null = null;
    if (alwaysActive) {
      void connectPreview();
    } else if (root) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            void connectPreview();
          } else {
            disconnectPreview();
          }
        },
        { threshold: 0.15, rootMargin: '120px 0px' },
      );
      observer.observe(root);
    }

    return () => {
      cancelled = true;
      window.removeEventListener(LIVE_PREVIEW_ACTIVE_EVENT, handleOtherPreview);
      observer?.disconnect();
      disconnectPreview();
    };
  }, [alwaysActive, currentUser?.id, liveSession, liveSessionStatus, postId]);

  const handleToggleLiveSubscription = async () => {
    if (!liveSession?.id) return;
    const user = authService.getCurrentUser();
    if (!user) {
      toast.error('Bạn cần đăng nhập để đặt nhắc nhở');
      return;
    }
    setIsSubscribeLoading(true);
    try {
      const result = isLiveSubscribed
        ? await liveService.unsubscribeFromEvent(liveSession.id)
        : await liveService.subscribeToEvent(liveSession.id);
      setIsLiveSubscribed(result.subscribed);
      setLiveSubscriptionCount(result.subscriptionCount);
      toast.success(result.subscribed ? 'Đã đặt nhắc nhở cho buổi live' : 'Đã bỏ quan tâm');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật nhắc nhở');
    } finally {
      setIsSubscribeLoading(false);
    }
  };

  const handleOpenSubscribers = async () => {
    if (!liveSession?.id) return;
    setIsSubscribersOpen(true);
    setIsSubscribersLoading(true);
    try {
      const result = await liveService.getEventSubscribers(liveSession.id);
      setEventSubscribers(result.subscribers);
      setLiveSubscriptionCount(result.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải danh sách người quan tâm');
      setIsSubscribersOpen(false);
    } finally {
      setIsSubscribersLoading(false);
    }
  };

  const handleOpenLive = async () => {
    try {
      const session = await liveService.getSessionByPost(postId);
      setLiveSession(session);
      setLiveSessionStatus(session.status);
      setIsLiveSubscribed(Boolean(session.subscribedByCurrentUser));
      setLiveSubscriptionCount(session.subscriptionCount ?? 0);
      if (session.status === 'SCHEDULED') {
        if (isOwner && isSessionHost(session, currentUser?.id) && isScheduledSessionDue(session.scheduledAt)) {
          await startScheduledLiveAndNavigate(session, navigate);
        }
        return;
      }
      if (session.status === 'ENDED' || session.status === 'CANCELED') {
        if (isPlayableUrl(session.playbackUrl)) {
          navigate(`/live/viewer?sessionId=${encodeURIComponent(session.id)}`);
          return;
        }
        if (session.recordingStatus === 'PROCESSING') {
          toast.info('Bản ghi live đang được xử lý.');
          return;
        }
        if (session.recordingStatus === 'FAILED') {
          toast.error('Không thể tạo bản ghi phát lại cho phiên live này.');
          return;
        }
        toast.info('Live đã kết thúc.');
        return;
      }
      await navigateToLiveSession(session, currentUser?.id, navigate);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể mở phiên live');
    }
  };

  return (
    <>
      <div className={className}>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-zinc-950 shadow-sm">
          <button
            ref={livePreviewRootRef}
            type="button"
            disabled={isScheduledLockedForHost}
            onClick={isScheduledLockedForHost ? undefined : () => void handleOpenLive()}
            className={`group relative block aspect-video w-full overflow-hidden bg-black text-left ${
              isScheduledLockedForHost ? 'cursor-default' : ''
            }`}
          >
            {(liveSessionStatus === 'LIVE' || liveReplayUrl) && (
              <video
                ref={liveSessionStatus === 'LIVE' ? livePreviewVideoRef : undefined}
                src={liveReplayUrl || undefined}
                muted
                autoPlay
                playsInline
                loop={Boolean(liveReplayUrl)}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                  isLivePreviewReady || liveReplayUrl ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}
            {showLivePlaceholder && (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-slate-800" />
            )}
            <div
              className={`absolute inset-0 transition-opacity duration-300 ${
                showLiveVideo ? 'opacity-0 group-hover:opacity-100' : 'opacity-40'
              } [background:radial-gradient(circle_at_25%_25%,rgba(239,68,68,.45),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(37,99,235,.38),transparent_30%),linear-gradient(135deg,rgba(15,23,42,.2),rgba(0,0,0,.9))]`}
            />
            <div className={`absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white shadow ${isLiveEnded ? 'bg-gray-700' : 'bg-red-600'}`}>
              <span className={`h-2 w-2 rounded-full bg-white ${isLiveEnded ? '' : 'animate-pulse'}`} />
              {scheduledLiveAt ? 'Đã lên lịch' : liveReplayUrl ? 'Phát lại' : isRecordingProcessing ? 'Đang xử lý' : isRecordingFailed ? 'Lỗi bản ghi' : isLiveEnded ? 'Đã kết thúc' : 'Live'}
            </div>
            {isLivePreviewConnecting && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/35">
                <span className="rounded-full bg-black/55 px-4 py-2 text-sm font-medium text-white">
                  Đang kết nối live...
                </span>
              </div>
            )}
            {!showLiveVideo && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur ${
                  isScheduledLockedForHost ? '' : 'transition-transform group-hover:scale-105'
                }`}>
                  {isScheduledLockedForHost ? (
                    <Lock className="h-7 w-7" />
                  ) : (
                    <Play className="ml-1 h-8 w-8 fill-white" />
                  )}
                </span>
              </div>
            )}
            <div className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/80 to-transparent p-4 text-white transition-opacity duration-300 ${
              showLiveVideo ? 'opacity-100 group-hover:opacity-100' : 'opacity-100'
            }`}>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-100">
                <Radio className="h-4 w-4" />
                {scheduledLiveAt
                  ? `Bắt đầu lúc ${scheduledLiveAt}`
                  : liveReplayUrl
                    ? 'Xem lại phiên live'
                    : isRecordingProcessing
                      ? 'Bản ghi đang được xử lý'
                      : isRecordingFailed
                        ? 'Không thể tạo bản ghi phát lại'
                        : isLiveEnded
                          ? 'Live đã kết thúc'
                          : isLivePreviewReady
                            ? 'Đang phát trực tiếp'
                            : isLivePreviewConnecting
                              ? 'Đang tải video live...'
                              : 'Đang phát trực tiếp'}
              </div>
              <h2 className="line-clamp-2 text-xl font-bold leading-tight">{liveTitle}</h2>
              {liveDescription && <p className="mt-1 line-clamp-2 text-sm text-white/75">{liveDescription}</p>}
            </div>
          </button>

          {!compact && (
            <div className="flex items-center justify-between gap-3 bg-surface px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{liveTitle}</p>
                <p className="text-xs text-gray-500">
                  {scheduledLiveAt
                    ? isOwner && !canStartScheduledLive
                      ? `Có thể bắt đầu phát lúc ${scheduledLiveAt}`
                      : scheduledLiveAt
                    : liveReplayUrl
                      ? 'Nhấn để xem lại phiên live đã phát'
                      : isRecordingProcessing
                        ? 'Vui lòng quay lại sau ít phút'
                        : isLivePreviewReady
                          ? 'Video live đang phát ngay trên bảng tin'
                          : 'Nhấn để xem phiên live và tham gia bình luận'}
                </p>
                {scheduledLiveAt && isOwner && liveSubscriptionCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleOpenSubscribers()}
                    className="mt-1 text-xs font-semibold text-green-700 hover:underline"
                  >
                    {liveSubscriptionCount} người quan tâm
                  </button>
                )}
                {scheduledLiveAt && isOwner && liveSubscriptionCount === 0 && (
                  <p className="mt-1 text-xs text-gray-400">Chưa có người quan tâm</p>
                )}
              </div>
              {scheduledLiveAt && isOwner ? (
                <button
                  type="button"
                  disabled={!canStartScheduledLive}
                  onClick={() => void handleOpenLive()}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                    canStartScheduledLive
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'cursor-not-allowed bg-gray-400'
                  }`}
                >
                  {canStartScheduledLive ? 'Bắt đầu phát' : 'Chưa đến giờ'}
                </button>
              ) : scheduledLiveAt ? (
                <button
                  type="button"
                  disabled={isSubscribeLoading}
                  onClick={() => void handleToggleLiveSubscription()}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold ${
                    isLiveSubscribed
                      ? 'border border-green-600 bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <Bell className="h-4 w-4" />
                  {isSubscribeLoading ? 'Đang lưu...' : isLiveSubscribed ? 'Đã quan tâm' : 'Quan tâm'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleOpenLive()}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                    isLiveEnded
                      ? 'bg-gray-700 hover:bg-gray-800'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {liveReplayUrl
                    ? 'Xem lại'
                    : isRecordingProcessing
                      ? 'Đang xử lý'
                      : isLiveEnded
                        ? 'Đã kết thúc'
                        : 'Xem trực tiếp'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isSubscribersOpen} onOpenChange={setIsSubscribersOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Người quan tâm sự kiện</DialogTitle>
          </DialogHeader>
          {isSubscribersLoading ? (
            <p className="py-6 text-center text-sm text-gray-500">Đang tải...</p>
          ) : eventSubscribers.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Chưa có ai đăng ký nhắc nhở.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {eventSubscribers.map((subscriber) => (
                <button
                  key={subscriber.userId}
                  type="button"
                  onClick={() => {
                    setIsSubscribersOpen(false);
                    navigate(`/profile/${subscriber.userId}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-gray-100"
                >
                  <ImageWithFallback
                    src={subscriber.avatarUrl || ''}
                    alt={subscriber.fullName || subscriber.username}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {subscriber.fullName || subscriber.username}
                    </p>
                    <p className="text-xs text-gray-500">@{subscriber.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
