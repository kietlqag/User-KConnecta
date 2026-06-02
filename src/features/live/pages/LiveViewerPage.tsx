import { MessageCircle, MoreHorizontal, Volume2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Room, RoomEvent, Track, type RemoteTrack } from 'livekit-client';
import { Header } from '../../home/components';
import { authService } from '@/services/authService';
import { liveService, type LiveSessionResponse, type LiveSessionToolStateResponse, type UpsertLiveReactionRequest } from '@/services/liveService';
import { postService, type PostCommentResponse } from '@/services/postService';

const reactions: Array<{ label: string; value: NonNullable<UpsertLiveReactionRequest['reactionType']> }> = [
  { label: '👍', value: 'LIKE' },
  { label: '❤️', value: 'LOVE' },
  { label: '😆', value: 'HAHA' },
  { label: '😮', value: 'WOW' },
  { label: '😢', value: 'SAD' },
  { label: '😡', value: 'ANGRY' },
];

export default function LiveViewerPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get('sessionId') ?? '';
  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.id ?? '';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [session, setSession] = useState<LiveSessionResponse | null>(null);
  const [status, setStatus] = useState('Đang tải phiên live...');
  const [error, setError] = useState('');
  const [activeReaction, setActiveReaction] = useState<UpsertLiveReactionRequest['reactionType']>(null);
  const [toolState, setToolState] = useState<LiveSessionToolStateResponse | null>(null);
  const [comments, setComments] = useState<PostCommentResponse[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const roomRef = useRef<Room | null>(null);

  const hostLabel = useMemo(() => {
    if (!session) return 'Người dùng';
    return session.title || 'Video trực tiếp';
  }, [session]);

  const isLiveEnded = session?.status === 'ENDED' || session?.status === 'CANCELED';

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
        setSession(liveSession);
        if (liveSession.status === 'ENDED' || liveSession.status === 'CANCELED') {
          setStatus('Live đã kết thúc.');
          return;
        }
        if (liveSession.postId) {
          const loadedComments = await postService.getComments(liveSession.postId, 0, 20, currentUserId);
          if (!cancelled) setComments(loadedComments.content);
        }

        await liveService.joinSession(sessionId, { userId: currentUserId });
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
      void liveService.leaveSession(sessionId, { userId: currentUserId }).catch(() => undefined);
    };
  }, [currentUserId, sessionId]);

  useEffect(() => {
    if (!sessionId || !currentUserId || isLiveEnded) return;
    const sendHeartbeat = async () => {
      try {
        const updated = await liveService.heartbeat(sessionId, { userId: currentUserId });
        setSession(updated);
      } catch {
        // The main LiveKit connection handles visible errors.
      }
    };
    const interval = window.setInterval(() => void sendHeartbeat(), 15000);
    return () => window.clearInterval(interval);
  }, [currentUserId, isLiveEnded, sessionId]);

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

  const handleReaction = async (reactionType: UpsertLiveReactionRequest['reactionType']) => {
    if (!sessionId || !currentUserId) return;
    const nextReaction = activeReaction === reactionType ? null : reactionType;
    setActiveReaction(nextReaction);
    try {
      const updated = await liveService.react(sessionId, { userId: currentUserId, reactionType: nextReaction });
      setSession(updated);
    } catch {
      setActiveReaction(activeReaction);
    }
  };

  const handleSubmitComment = async () => {
    const content = commentText.trim();
    if (!content || !currentUserId || !session?.postId || isSendingComment) return;
    setIsSendingComment(true);
    try {
      const saved = await postService.addComment(session.postId, { userId: currentUserId, content });
      setComments((prev) => [...prev, saved]);
      setCommentText('');
    } finally {
      setIsSendingComment(false);
    }
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

          <div className="absolute top-4 right-4 rounded-md bg-red-600 text-white text-sm font-semibold px-2 py-1">TRỰC TIẾP</div>

          <div className="h-[calc(100vh-160px)] flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="h-full w-full object-contain" />
            <audio ref={audioRef} autoPlay />
            {(error || status !== 'Đang xem trực tiếp.') && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 px-5 text-center text-white/80">
                <div>
                  <p className="text-lg font-semibold">{error || status}</p>
                  {isLiveEnded && <p className="mt-2 text-sm text-white/70">Bạn có thể quay lại bài viết để xem tương tác của buổi live.</p>}
                </div>
              </div>
            )}
          </div>

          <div
            className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity duration-200 ${
              showControls ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <div className="flex items-center gap-3 text-white text-sm mb-2">
              <span>{status}</span>
              <div className="flex-1 h-1 rounded bg-white/30 overflow-hidden">
                <div className="h-full w-full bg-blue-500" />
              </div>
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2 text-3xl">
              {reactions.map((reaction) => (
                <button
                  key={reaction.value}
                  type="button"
                  onClick={() => void handleReaction(reaction.value)}
                  className={`rounded-full px-1 transition-transform hover:scale-110 ${activeReaction === reaction.value ? 'bg-white/20' : ''}`}
                  aria-label={`Bày tỏ cảm xúc ${reaction.value}`}
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
                    {toolState.pollOptions.map((option) => (
                      <button key={option} className="w-full rounded-lg bg-white px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-blue-50">
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-xl bg-gray-100 p-4 text-gray-700">
            {comments.length === 0 ? (
              <div className="p-5 text-center text-gray-500">
                <MessageCircle className="w-7 h-7 mx-auto mb-2" />
                <p className="font-semibold">Chưa có bình luận</p>
                <p className="text-sm">Bình luận đầu tiên sẽ hiển thị tại đây.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-xl bg-white px-3 py-2 shadow-sm">
                    <p className="text-sm font-semibold text-gray-900">{comment.userFullName || comment.username || 'Người dùng'}</p>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-auto pt-4 border-t border-gray-200 flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-gray-200" />
            <input
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleSubmitComment();
              }}
              className="flex-1 rounded-full bg-gray-100 px-4 py-2.5 outline-none"
              placeholder="Viết bình luận..."
            />
            <button
              type="button"
              disabled={!commentText.trim() || isSendingComment}
              onClick={() => void handleSubmitComment()}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300"
            >
              Gửi
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
