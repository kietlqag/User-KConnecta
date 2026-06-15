import { MoreHorizontal, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Room, RoomEvent, Track, type RemoteTrack } from 'livekit-client';
import { toast } from 'sonner';
import { Header } from '../../home/components';
import { authService } from '@/services/authService';
import { liveService, type LiveSessionRealtimeEvent, type LiveSessionResponse, type LiveSessionToolStateResponse, type UpsertLiveReactionRequest } from '@/services/liveService';
import { LiveCommentPanel } from '../components/LiveCommentPanel';
import { LiveFloatingReactions, useLiveReactionBursts } from '../components/LiveFloatingReactions';
import { isLiveSessionHost, navigateToLiveSession } from '../utils/navigateToLiveSession';
import { useLiveSessionSocket } from '../hooks/useLiveSessionSocket';

const reactions: Array<{ label: string; value: NonNullable<UpsertLiveReactionRequest['reactionType']> }> = [
  { label: '👍', value: 'LIKE' },
  { label: '❤️', value: 'LOVE' },
  { label: '😆', value: 'HAHA' },
  { label: '😮', value: 'WOW' },
  { label: '😢', value: 'SAD' },
  { label: '😡', value: 'ANGRY' },
];

const isPlayableUrl = (value?: string | null) => /^https?:\/\//i.test(value?.trim() ?? '');

function formatLiveElapsed(startedAt?: string | null) {
  if (!startedAt) return '00:00';
  const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(elapsedSec / 3600);
  const minutes = Math.floor((elapsedSec % 3600) / 60);
  const seconds = elapsedSec % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function LiveViewerPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get('sessionId') ?? '';
  const isViewerPreview = params.get('preview') === '1';
  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.id ?? '';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [session, setSession] = useState<LiveSessionResponse | null>(null);
  const [status, setStatus] = useState('Đang tải phiên live...');
  const [error, setError] = useState('');
  const [activeReaction, setActiveReaction] = useState<UpsertLiveReactionRequest['reactionType']>(null);
  const [toolState, setToolState] = useState<LiveSessionToolStateResponse | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [liveElapsed, setLiveElapsed] = useState('00:00');
  const [isReacting, setIsReacting] = useState(false);
  const [isVotingPoll, setIsVotingPoll] = useState(false);
  const { bursts, pushBurst } = useLiveReactionBursts();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const roomRef = useRef<Room | null>(null);

  const hostLabel = useMemo(() => {
    if (!session) return 'Người dùng';
    return session.title || 'Video trực tiếp';
  }, [session]);

  const isLiveEnded = session?.status === 'ENDED' || session?.status === 'CANCELED';
  const replayUrl = isLiveEnded && isPlayableUrl(session?.playbackUrl) ? session?.playbackUrl?.trim() : '';

  const handleLiveEvent = useCallback((event: LiveSessionRealtimeEvent) => {
    if (event.session) {
      setSession(event.session);
    } else if (event.viewerCount != null || event.totalReactionCount != null) {
      setSession((prev) => prev ? {
        ...prev,
        viewerCount: event.viewerCount ?? prev.viewerCount,
        peakViewerCount: event.peakViewerCount ?? prev.peakViewerCount,
        totalReactionCount: event.totalReactionCount ?? prev.totalReactionCount,
      } : prev);
    }
    if (event.type === 'REACTION_UPDATED') {
      if (event.reactedUserId === currentUserId) {
        setActiveReaction(event.reactionType ?? null);
      }
      if (event.reactionType) {
        pushBurst(event.reactionType);
      }
    }
    if (event.tools) {
      setToolState(event.tools);
    }
    if (event.type === 'LIVE_ENDED') {
      roomRef.current?.disconnect();
      setStatus('Live đã kết thúc.');
      setError('');
      if (!isViewerPreview && currentUserId && sessionId) {
        void liveService.leaveSession(sessionId).catch(() => undefined);
      }
    }
  }, [currentUserId, isViewerPreview, pushBurst, sessionId]);

  useLiveSessionSocket(sessionId, currentUser?.token, handleLiveEvent);

  useEffect(() => {
    if (!sessionId || !currentUserId) {
      setError('Thiếu sessionId hoặc người dùng chưa đăng nhập.');
      setStatus('Không thể mở live.');
      return;
    }

    let cancelled = false;
    const room = new Room();
    roomRef.current = room;

    const attachTrack = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
      }
      if (track.kind === Track.Kind.Audio && audioRef.current) {
        track.attach(audioRef.current);
      }
    };

    room.on(RoomEvent.TrackSubscribed, attachTrack);
    room.on(RoomEvent.Disconnected, () => {
      if (!cancelled) setStatus('Live đã ngắt kết nối.');
    });

    const connect = async () => {
      try {
        const liveSession = await liveService.getSession(sessionId);
        if (cancelled) return;
        if (!isViewerPreview && isLiveSessionHost(liveSession, currentUserId)) {
          await navigateToLiveSession(liveSession, currentUserId, navigate);
          return;
        }
        setSession(liveSession);
        if (liveSession.status === 'ENDED' || liveSession.status === 'CANCELED') {
          if (liveSession.recordingStatus === 'PROCESSING' && !isPlayableUrl(liveSession.playbackUrl)) {
            setStatus('Bản ghi live đang được xử lý.');
            return;
          }
          if (liveSession.recordingStatus === 'FAILED' && !isPlayableUrl(liveSession.playbackUrl)) {
            setStatus('Không thể tạo bản ghi phát lại cho phiên live này.');
            return;
          }
          setStatus('Live đã kết thúc.');
          return;
        }
        if (liveSession.status === 'SCHEDULED') {
          setStatus('Live đã được lên lịch. Chờ host bắt đầu phát.');
          return;
        }
        if (!isViewerPreview) {
          const joinedSession = await liveService.joinSession(sessionId);
          if (!cancelled) setSession(joinedSession);
        }
        try {
          const reaction = await liveService.getReaction(sessionId);
          if (!cancelled) setActiveReaction(reaction.reactionType ?? null);
        } catch {
          // Reaction state is optional on first load.
        }
        const token = await liveService.getToken({ sessionId, userId: currentUserId, role: 'VIEWER' });
        await room.connect(token.livekitUrl, token.token);
        if (cancelled) return;
        setStatus('Đang xem trực tiếp.');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Không thể tham gia live.');
          setStatus('Không thể mở live.');
        }
      }
    };

    void connect();

    return () => {
      cancelled = true;
      room.disconnect();
      roomRef.current = null;
      if (!isViewerPreview) {
        void liveService.leaveSession(sessionId).catch(() => undefined);
      }
    };
  }, [currentUser?.token, currentUserId, isViewerPreview, navigate, sessionId]);

  useEffect(() => {
    if (!sessionId || !currentUserId || isLiveEnded || isViewerPreview) return;
    const sendHeartbeat = async () => {
      try {
        const updated = await liveService.heartbeat(sessionId);
        setSession(updated);
      } catch {
        try {
          const updated = await liveService.getSession(sessionId);
          setSession(updated);
        } catch {
          // The main LiveKit connection handles visible errors.
        }
      }
    };
    const interval = window.setInterval(() => void sendHeartbeat(), 15000);
    return () => window.clearInterval(interval);
  }, [currentUserId, isLiveEnded, isViewerPreview, sessionId]);

  useEffect(() => {
    if (!isLiveEnded) return;
    roomRef.current?.disconnect();
    setStatus('Live đã kết thúc.');
  }, [isLiveEnded]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const loadTools = async () => {
      try {
        const data = await liveService.getTools(sessionId);
        if (!cancelled) setToolState(data);
      } catch {
        if (!cancelled) setToolState(null);
      }
    };
    void loadTools();
    const interval = window.setInterval(() => void loadTools(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!session?.startedAt || isLiveEnded) return;
    const updateElapsed = () => setLiveElapsed(formatLiveElapsed(session.startedAt));
    updateElapsed();
    const interval = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(interval);
  }, [isLiveEnded, session?.startedAt]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleReaction = async (reactionType: NonNullable<UpsertLiveReactionRequest['reactionType']>) => {
    if (!sessionId || !currentUserId || isLiveEnded || isReacting) return;
    const previousReaction = activeReaction;
    const nextReaction = activeReaction === reactionType ? null : reactionType;
    setActiveReaction(nextReaction);
    setIsReacting(true);
    try {
      const updated = await liveService.react(sessionId, { reactionType: nextReaction });
      setSession(updated);
      if (nextReaction) {
        pushBurst(nextReaction);
      }
    } catch (err) {
      setActiveReaction(previousReaction);
      toast.error(err instanceof Error ? err.message : 'Không thể gửi cảm xúc live.');
    } finally {
      setIsReacting(false);
    }
  };

  const handleVotePoll = async (optionIndex: number) => {
    if (!sessionId || isViewerPreview || isLiveEnded || !currentUserId) return;
    setIsVotingPoll(true);
    try {
      const updated = await liveService.votePoll(sessionId, { optionIndex });
      setToolState(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể bình chọn.');
    } finally {
      setIsVotingPoll(false);
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleCopyLiveLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setIsMenuOpen(false);
  };

  const handleCloseLive = () => {
    if (session?.postId) {
      navigate(`/home?post=${encodeURIComponent(session.postId)}`);
      return;
    }
    navigate('/live');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="pt-14 grid grid-cols-1 xl:grid-cols-[1.35fr_380px] gap-0">
        <section
          className="group/player bg-black min-h-[calc(100vh-56px)] relative"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
          onFocus={() => setShowControls(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setShowControls(false);
            }
          }}
        >
          <button
            onClick={handleCloseLive}
            className={`absolute left-4 top-4 z-10 rounded-full bg-black/30 p-1 text-white/90 transition-opacity duration-200 hover:bg-black/50 hover:text-white ${
              showControls ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            aria-label="Đóng"
          >
            <X className="w-8 h-8" />
          </button>

          {!isLiveEnded && (
            <div className="absolute top-4 right-4 rounded-md bg-red-600 text-white text-sm font-semibold px-2 py-1">TRỰC TIẾP</div>
          )}

          <div className="h-[calc(100vh-160px)] flex items-center justify-center">
            {replayUrl ? (
              <video src={replayUrl} controls autoPlay playsInline className="h-full w-full object-contain" />
            ) : (
              <>
                <video ref={videoRef} autoPlay playsInline className="h-full w-full object-contain" />
                <audio ref={audioRef} autoPlay />
              </>
            )}
            {(error || status !== 'Đang xem trực tiếp.') && (
              <div className={`${replayUrl ? 'hidden ' : ''}absolute inset-0 flex items-center justify-center bg-black/50 px-5 text-center text-white/80`}>
                <div>
                  <p className="text-lg font-semibold">{error || status}</p>
                  {isLiveEnded && <p className="mt-2 text-sm text-white/70">Bạn có thể quay lại bài viết để xem tương tác của buổi live.</p>}
                </div>
              </div>
            )}
          </div>

          <LiveFloatingReactions bursts={bursts} />

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4">
            <div
              className={`mb-2 flex items-center gap-3 text-sm text-white transition-opacity duration-200 ${
                showControls ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <span>{status}</span>
              <div className="flex-1 overflow-hidden rounded bg-white/30">
                <div className="h-1 w-full bg-blue-500" />
              </div>
              <span className="min-w-[44px] text-right text-xs text-white/80">{liveElapsed}</span>
              <button
                type="button"
                onClick={handleToggleMute}
                className="rounded-full p-1 hover:bg-white/10"
                aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
            <div className="flex items-center gap-2 text-3xl">
              {reactions.map((reaction) => (
                <button
                  key={reaction.value}
                  type="button"
                  disabled={isLiveEnded || isReacting}
                  onClick={() => void handleReaction(reaction.value)}
                  className={`rounded-full px-1 transition-transform hover:scale-125 disabled:cursor-not-allowed disabled:opacity-40 ${
                    activeReaction === reaction.value ? 'bg-white/25 ring-2 ring-white/60 scale-110' : ''
                  }`}
                  aria-label={`Bày tỏ cảm xúc ${reaction.value}`}
                  aria-pressed={activeReaction === reaction.value}
                >
                  {reaction.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="relative border-l border-gray-200 bg-white min-h-[calc(100vh-56px)] p-4 flex flex-col">
          <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
            <div className="h-12 w-12 rounded-full bg-gray-200" />
            <div className="flex-1 min-w-0">
              <p className="text-xl font-semibold text-gray-900">{hostLabel}</p>
              <p className="text-sm text-gray-500">
                {session ? `${session.viewerCount} người đang xem · ${session.totalReactionCount} cảm xúc` : 'Đang tải...'}
              </p>
            </div>
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Tùy chọn"
            >
              <MoreHorizontal className="w-6 h-6" />
            </button>
          </div>

          {isMenuOpen && (
            <div className="absolute right-4 top-20 z-20 w-[360px] rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
              <button onClick={() => void handleCopyLiveLink()} className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100">
                <p className="font-semibold text-gray-900">Sao chép liên kết</p>
              </button>
              <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100">
                <p className="font-semibold text-gray-900">Tắt thông báo về bài viết này</p>
              </button>
            </div>
          )}

          {(toolState?.hostNotice || toolState?.featuredLinkUrl || toolState?.pollEnabled) && (
            <div className="mt-4 space-y-3">
              {toolState.hostNotice && (
                <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
                  {toolState.hostNotice}
                </div>
              )}
              {toolState.featuredLinkUrl && (
                <a href={toolState.featuredLinkUrl} target="_blank" rel="noreferrer" className="block rounded-xl bg-gray-100 p-3 text-sm font-semibold text-blue-700">
                  {toolState.featuredLinkTitle || toolState.featuredLinkUrl}
                </a>
              )}
              {toolState.pollEnabled && toolState.pollQuestion && (
                <div className="rounded-xl bg-gray-100 p-3">
                  <p className="font-semibold text-gray-900">{toolState.pollQuestion}</p>
                  <div className="mt-2 space-y-2">
                    {toolState.pollOptions.map((option, index) => {
                      const count = toolState.pollOptionCounts?.[index] ?? 0;
                      const totalVotes = toolState.pollOptionCounts?.reduce((sum, value) => sum + value, 0) ?? 0;
                      const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                      const isSelected = toolState.myPollOptionIndex === index;
                      const canVote = !isViewerPreview && !isLiveEnded && Boolean(currentUserId);
                      return (
                        <button
                          key={`${option}-${index}`}
                          type="button"
                          disabled={!canVote || isVotingPoll}
                          onClick={() => void handleVotePoll(index)}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-800 hover:bg-blue-50'
                          } ${!canVote ? 'cursor-default' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>{option}</span>
                            {totalVotes > 0 && (
                              <span className={isSelected ? 'text-blue-100' : 'text-gray-500'}>
                                {percent}% ({count})
                              </span>
                            )}
                          </div>
                          {totalVotes > 0 && (
                            <div className={`mt-1 h-1.5 rounded-full ${isSelected ? 'bg-blue-400' : 'bg-gray-200'}`}>
                              <div
                                className={`h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-600'}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {isLiveEnded && !isViewerPreview && (
                    <p className="mt-2 text-xs text-gray-500">Thăm dò đã đóng cùng phiên live.</p>
                  )}
                  {isViewerPreview && (
                    <p className="mt-2 text-xs text-gray-500">Chế độ xem trước — không thể bình chọn.</p>
                  )}
                  {!currentUserId && !isViewerPreview && !isLiveEnded && (
                    <p className="mt-2 text-xs text-gray-500">Đăng nhập để tham gia bình chọn.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <LiveCommentPanel
            postId={session?.postId ?? undefined}
            sessionId={sessionId}
            hostUserId={session?.hostUserId}
            isHost={Boolean(currentUserId && session?.hostUserId === currentUserId)}
            disabled={isLiveEnded}
            toolState={toolState}
            onToolStateChange={setToolState}
            className="mt-4 min-h-0 flex-1"
          />
        </aside>
      </div>
    </div>
  );
}
