import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  MoreHorizontal,
  Edit,
  RefreshCw,
  BellOff,
  ChevronDown,
  Phone,
  PhoneOff,
  Volume1,
  Volume2,
  Mic,
  MicOff,
  Video,
  VideoOff,
  X,
  Search as SearchIcon,
} from 'lucide-react';
import { Header } from '../../home/components';
import { ConversationItem } from '../components';
import { ChatWindow } from '../components';
import { Conversation, MessengerFilter } from '../types/messenger.types';
import { ChatUser, IncomingCallSignal, IncomingChatMessage, Message } from '../types/message.types';
import { useChatSocket } from '../hooks/useChatSocket';
import { useFriendConversations } from '../hooks/useFriendConversations';
import { useVoiceCall } from '../hooks/useVoiceCall';
import { authService } from '@/services/authService';
import { chatService } from '@/services/chatService';

const CALL_LOG_PREFIX = '__CALL_LOG__:';

function mapBackendContentToMessageFields(
  content: string,
): Pick<Message, 'text' | 'systemType' | 'callLogKind' | 'callDurationSec' | 'callMediaType'> {
  if (!content?.startsWith(CALL_LOG_PREFIX)) {
    return { text: content };
  }

  try {
    const payload = JSON.parse(content.slice(CALL_LOG_PREFIX.length));
    const mediaType: 'audio' | 'video' =
      payload?.mediaType === 'video' || String(payload?.label || '').toLowerCase().includes('video')
        ? 'video'
        : 'audio';
    const fallbackLabel =
      payload?.kind === 'completed'
        ? mediaType === 'video'
          ? 'Cuộc gọi video hoàn thành'
          : 'Cuộc gọi thoại hoàn thành'
        : mediaType === 'video'
          ? 'Đã bỏ lỡ cuộc gọi video'
          : 'Đã bỏ lỡ cuộc gọi thoại';

    return {
      text: payload?.label || fallbackLabel,
      systemType: 'call_log',
      callLogKind: payload?.kind === 'completed' ? 'completed' : 'missed',
      callDurationSec: typeof payload?.durationSec === 'number' ? payload.durationSec : undefined,
      callMediaType: mediaType,
    };
  } catch {
    return {
      text: 'Đã bỏ lỡ cuộc gọi thoại',
      systemType: 'call_log',
      callLogKind: 'missed',
      callMediaType: 'audio',
    };
  }
}

function formatConversationPreview(text: string, isOwn: boolean) {
  const normalized = text.trim();
  if (!normalized) return '';
  return isOwn ? `Bạn: ${normalized}` : normalized;
}

function ChatInfoPanel({ user }: { user: ChatUser }) {
  return (
    <aside
      className="hidden xl:flex w-[320px] shrink-0 border-l border-gray-200 bg-white p-5 flex-col gap-5"
      style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
    >
      <div className="text-center">
        <img
          src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
          alt={user.name}
          className="w-24 h-24 rounded-full object-cover mx-auto"
        />
        <h3 className="mt-3 text-xl font-semibold text-gray-900 tracking-tight">{user.name}</h3>
        <p className="text-sm text-gray-500">{user.isOnline ? 'Đang hoạt động' : 'Không hoạt động'}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <button
          className="rounded-xl bg-gray-100 h-14 flex items-center justify-center hover:bg-gray-200 transition-colors"
          title="Tắt thông báo"
        >
          <BellOff className="w-5 h-5 text-gray-700" />
        </button>
        <button
          className="rounded-xl bg-gray-100 h-14 flex items-center justify-center hover:bg-gray-200 transition-colors"
          title="Tìm kiếm"
        >
          <SearchIcon className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      <button className="w-full flex items-center justify-between rounded-lg px-2 py-3 hover:bg-gray-50 transition-colors text-left">
        <span className="text-[15px] font-medium text-gray-800">File phương tiện & file</span>
        <ChevronDown className="w-5 h-5 text-gray-500" />
      </button>
      <button className="w-full flex items-center justify-between rounded-lg px-2 py-3 hover:bg-gray-50 transition-colors text-left">
        <span className="text-[15px] font-medium text-gray-800">Quyền riêng tư và hỗ trợ</span>
        <ChevronDown className="w-5 h-5 text-gray-500" />
      </button>
    </aside>
  );
}

export default function MessengerPage() {
  const currentUser = authService.getCurrentUser();

  const {
    conversations: baseConversations,
    loading: loadingConversations,
    error: friendsError,
    reload: loadFriends,
  } = useFriendConversations();

  const [overrides, setOverrides] = useState<Record<string, Partial<Conversation>>>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const [messagesByUser, setMessagesByUser] = useState<Record<string, Message[]>>({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeFilter, setActiveFilter] = useState<MessengerFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCallModal, setShowCallModal] = useState(true);
  const [speakerMode, setSpeakerMode] = useState<'inner' | 'outer'>('inner');
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callDurationSec, setCallDurationSec] = useState(0);

  const callSignalHandlerRef = useRef<(signal: IncomingCallSignal) => void>(() => {});
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const callRecorderRef = useRef<MediaRecorder | null>(null);
  const callRecorderChunksRef = useRef<Blob[]>([]);
  const callRecorderAudioCtxRef = useRef<AudioContext | null>(null);
  const callRecorderMetaRef = useRef<{ callId: string; startedAt: number; mediaType: 'audio' | 'video' } | null>(null);
  const isUploadingRecordingRef = useRef(false);

  const conversations: Conversation[] = baseConversations.map((c) => ({
    ...c,
    ...(overrides[c.user.id] ?? {}),
  }));

  const activeChatUserId = searchParams.get('with');

  const activeChatUser = useMemo((): ChatUser | null => {
    if (!activeChatUserId) return null;
    const conv = baseConversations.find((c) => c.user.id === activeChatUserId);
    if (!conv) return null;
    return {
      id: conv.user.id,
      name: conv.user.name,
      avatar: conv.user.avatar,
      isOnline: false,
    };
  }, [activeChatUserId, baseConversations]);

  useEffect(() => {
    if (!activeChatUserId || !currentUser?.id) return;
    let cancelled = false;

    setLoadingMessages(true);
    chatService
      .getChatHistory(currentUser.id, activeChatUserId)
      .then((history) => {
        if (cancelled) return;

        const myId = currentUser.id;
        const msgs: Message[] = history.map((m) => ({
          ...mapBackendContentToMessageFields(m.content),
          id: `${m.createdAt}-${m.senderId}`,
          senderId: m.senderId,
          timestamp: new Date(m.createdAt),
          isOwn: m.senderId === myId,
        }));

        setMessagesByUser((prev) => ({ ...prev, [activeChatUserId]: msgs }));

        if (msgs.length > 0) {
          const last = msgs[msgs.length - 1];
          setOverrides((prev) => ({
            ...prev,
            [activeChatUserId]: {
              ...(prev[activeChatUserId] ?? {}),
              lastMessage: formatConversationPreview(last.text, last.isOwn),
              timestamp: last.timestamp.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            },
          }));
        }
      })
      .catch(() => {
        if (cancelled) return;
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeChatUserId, currentUser?.id]);

  const handleIncomingMessage = useCallback(
    (msg: IncomingChatMessage) => {
      const myId = currentUser?.id;
      const otherUserId = msg.senderId === myId ? msg.receiverId : msg.senderId;
      const parsed = mapBackendContentToMessageFields(msg.content);

      const newMsg: Message = {
        ...parsed,
        id: `${Date.now()}-${Math.random()}`,
        senderId: msg.senderId,
        timestamp: new Date(msg.createdAt),
        isOwn: msg.senderId === myId,
      };

      setMessagesByUser((prev) => ({
        ...prev,
        [otherUserId]: [...(prev[otherUserId] ?? []), newMsg],
      }));

      setOverrides((prev) => ({
        ...prev,
        [otherUserId]: {
          ...(prev[otherUserId] ?? {}),
          lastMessage: formatConversationPreview(parsed.text, msg.senderId === myId),
          timestamp: 'Vừa xong',
          isUnread: activeChatUserId !== otherUserId,
        },
      }));
    },
    [activeChatUserId, currentUser?.id],
  );

  const handleIncomingCallSignalFromSocket = useCallback((signal: IncomingCallSignal) => {
    callSignalHandlerRef.current(signal);
  }, []);

  const { connected, sendMessage, sendCallSignal } = useChatSocket(
    currentUser?.token,
    handleIncomingMessage,
    handleIncomingCallSignalFromSocket,
  );

  const voiceCall = useVoiceCall({
    currentUserId: currentUser?.id,
    sendCallSignal,
  });

  useEffect(() => {
    callSignalHandlerRef.current = (signal: IncomingCallSignal) => {
      void voiceCall.handleIncomingSignal(signal);
    };
  }, [voiceCall.handleIncomingSignal]);

  useEffect(() => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    audio.srcObject = voiceCall.remoteStream;
    return () => {
      audio.srcObject = null;
    };
  }, [voiceCall.remoteStream]);

  useEffect(() => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    audio.muted = false;
    audio.volume = speakerMode === 'outer' ? 1 : 0.45;
  }, [speakerMode, voiceCall.remoteStream]);

  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video) return;
    const shouldShowRemoteVideo = voiceCall.callMediaType === 'video' && Boolean(voiceCall.remoteStream);
    video.srcObject = shouldShowRemoteVideo ? voiceCall.remoteStream : null;
  }, [voiceCall.callMediaType, voiceCall.remoteStream]);

  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;
    const shouldShowLocalVideo = voiceCall.callMediaType === 'video' && Boolean(voiceCall.localStream);
    video.srcObject = shouldShowLocalVideo ? voiceCall.localStream : null;
  }, [voiceCall.callMediaType, voiceCall.localStream]);

  const stopAndUploadCallRecording = useCallback(
    async (finalCallId?: string | null) => {
      const recorder = callRecorderRef.current;
      const meta = callRecorderMetaRef.current;
      if (!recorder || !meta) {
        return;
      }

      if (recorder.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          recorder.stop();
        });
      }

      const fallbackMimeType = meta.mediaType === 'video' ? 'video/webm' : 'audio/webm';
      const mimeType = recorder.mimeType || fallbackMimeType;
      const blob = new Blob(callRecorderChunksRef.current, { type: mimeType });
      const callId = finalCallId ?? meta.callId;
      const durationSec = Math.max(0, Math.floor((Date.now() - meta.startedAt) / 1000));

      callRecorderRef.current = null;
      callRecorderChunksRef.current = [];
      callRecorderMetaRef.current = null;

      const audioCtx = callRecorderAudioCtxRef.current;
      callRecorderAudioCtxRef.current = null;
      if (audioCtx) {
        try {
          await audioCtx.close();
        } catch {
          // ignore close errors
        }
      }

      if (!callId || blob.size === 0 || isUploadingRecordingRef.current) {
        return;
      }

      isUploadingRecordingRef.current = true;
      try {
        const fileExt = mimeType.toLowerCase().includes('mp4') ? 'mp4' : 'webm';
        const file = new File([blob], `call-${callId}-${Date.now()}.${fileExt}`, {
          type: mimeType,
        });
        await chatService.uploadCallRecording(callId, file, durationSec, meta.mediaType);
      } catch (error) {
        console.error('[MessengerPage] Failed to upload call recording:', error);
      } finally {
        isUploadingRecordingRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    const canRecord =
      (voiceCall.status === 'connecting' || voiceCall.status === 'in_call') &&
      Boolean(voiceCall.activeCallId) &&
      Boolean(voiceCall.localStream);

    if (!canRecord) {
      if (callRecorderRef.current) {
        void stopAndUploadCallRecording(voiceCall.activeCallId);
      }
      return;
    }

    if (callRecorderRef.current) {
      return;
    }

    const callId = voiceCall.activeCallId;
    const localStream = voiceCall.localStream;
    const remoteStream = voiceCall.remoteStream;
    if (!callId || !localStream) {
      return;
    }

    const audioCtx = new AudioContext();
    const destination = audioCtx.createMediaStreamDestination();
    const localSource = audioCtx.createMediaStreamSource(localStream);
    localSource.connect(destination);
    if (remoteStream) {
      const remoteSource = audioCtx.createMediaStreamSource(remoteStream);
      remoteSource.connect(destination);
    }

    const recordingStream = new MediaStream();
    destination.stream.getAudioTracks().forEach((track) => {
      recordingStream.addTrack(track);
    });

    const isVideoCallRecording = voiceCall.callMediaType === 'video';
    if (isVideoCallRecording) {
      const remoteVideoTrack = remoteStream?.getVideoTracks().find((track) => track.readyState === 'live');
      const localVideoTrack = localStream.getVideoTracks().find((track) => track.readyState === 'live');
      const videoTrack = remoteVideoTrack ?? localVideoTrack;
      if (videoTrack) {
        recordingStream.addTrack(videoTrack);
      }
    }

    const hasVideoTrack = recordingStream.getVideoTracks().length > 0;
    const preferredMimeTypes = hasVideoTrack
      ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
      : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    const supportedMimeType = preferredMimeTypes.find((mime) => MediaRecorder.isTypeSupported(mime));
    const recorder = supportedMimeType
      ? new MediaRecorder(recordingStream, { mimeType: supportedMimeType })
      : new MediaRecorder(recordingStream);

    callRecorderAudioCtxRef.current = audioCtx;
    callRecorderChunksRef.current = [];
    callRecorderMetaRef.current = { callId, startedAt: Date.now(), mediaType: hasVideoTrack ? 'video' : 'audio' };
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        callRecorderChunksRef.current.push(event.data);
      }
    };
    recorder.start(1000);
    callRecorderRef.current = recorder;

    return () => {
      if (callRecorderRef.current === recorder) {
        void stopAndUploadCallRecording(callId);
      }
    };
  }, [
    stopAndUploadCallRecording,
    voiceCall.activeCallId,
    voiceCall.callMediaType,
    voiceCall.localStream,
    voiceCall.remoteStream,
    voiceCall.status,
  ]);


  const handleConversationClick = useCallback(
    (conversation: Conversation) => {
      const otherUserId = conversation.user.id;
      setSearchParams({ with: otherUserId });
      setOverrides((prev) => ({
        ...prev,
        [otherUserId]: { ...(prev[otherUserId] ?? {}), isUnread: false },
      }));
    },
    [setSearchParams],
  );

  const handleBackToList = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!activeChatUserId) return;
      sendMessage(activeChatUserId, content);
    },
    [activeChatUserId, sendMessage],
  );

  const handleStartVoiceCall = useCallback(() => {
    if (!activeChatUserId) return;
    setShowCallModal(true);
    setSpeakerMode('inner');
    void voiceCall.startCall(activeChatUserId, 'audio');
  }, [activeChatUserId, voiceCall]);

  const handleStartVideoCall = useCallback(() => {
    if (!activeChatUserId) return;
    setShowCallModal(true);
    setSpeakerMode('outer');
    void voiceCall.startCall(activeChatUserId, 'video');
  }, [activeChatUserId, voiceCall]);

  const handleCallAgain = useCallback(
    (mediaType: 'audio' | 'video' = 'audio') => {
      if (mediaType === 'video') {
        handleStartVideoCall();
      } else {
        handleStartVoiceCall();
      }
    },
    [handleStartVideoCall, handleStartVoiceCall],
  );

  const handleEndVoiceCall = useCallback(() => {
    voiceCall.endCall();
  }, [voiceCall]);

  const handleToggleMute = useCallback(() => {
    voiceCall.toggleMute();
  }, [voiceCall]);

  const handleToggleCamera = useCallback(() => {
    voiceCall.toggleCamera();
  }, [voiceCall]);

  const handleAcceptIncomingCall = useCallback(() => {
    if (voiceCall.incomingPeerUserId) {
      setSearchParams({ with: voiceCall.incomingPeerUserId });
    }
    setShowCallModal(true);
    setSpeakerMode(voiceCall.incomingMediaType === 'video' ? 'outer' : 'inner');
    void voiceCall.acceptIncoming();
  }, [setSearchParams, voiceCall]);

  const handleRejectIncomingCall = useCallback(() => {
    voiceCall.rejectIncoming();
  }, [voiceCall]);

  const handleReactMessage = useCallback(
    (messageId: string, emoji: string) => {
      if (!activeChatUserId) return;
      setMessagesByUser((prev) => {
        const msgs = prev[activeChatUserId] ?? [];
        return {
          ...prev,
          [activeChatUserId]: msgs.map((m) =>
            m.id === messageId ? { ...m, reactions: emoji === '' ? [] : [emoji] } : m,
          ),
        };
      });
    },
    [activeChatUserId],
  );

  const filters: { key: MessengerFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'unread', label: 'Chưa đọc' },
  ];

  const filteredConversations = conversations.filter((conv) => {
    if (activeFilter === 'unread' && !conv.isUnread) return false;
    if (searchQuery && !conv.user.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const activeMessages = activeChatUserId ? (messagesByUser[activeChatUserId] ?? []) : [];

  const incomingCallUser = useMemo(() => {
    if (!voiceCall.incomingPeerUserId) return null;
    const conv = conversations.find((c) => c.user.id === voiceCall.incomingPeerUserId);
    const name = conv?.user.name || voiceCall.incomingFromUsername || 'Người dùng';
    const avatar =
      conv?.user.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    return { id: voiceCall.incomingPeerUserId, name, avatar };
  }, [conversations, voiceCall.incomingFromUsername, voiceCall.incomingPeerUserId]);

  const activeWindowCallStatus = useMemo<
    'idle' | 'calling' | 'ringing' | 'connecting' | 'in_call' | 'ended' | 'error'
  >(() => {
    if (!activeChatUserId) return 'idle';
    if (voiceCall.activePeerUserId === activeChatUserId) return voiceCall.status;
    if (voiceCall.incomingPeerUserId === activeChatUserId && voiceCall.isRinging) return 'ringing';
    return 'idle';
  }, [
    activeChatUserId,
    voiceCall.activePeerUserId,
    voiceCall.incomingPeerUserId,
    voiceCall.isRinging,
    voiceCall.status,
  ]);

  const isCallOngoing =
    voiceCall.status === 'calling' || voiceCall.status === 'connecting' || voiceCall.status === 'in_call';
  const isCallConnected = voiceCall.status === 'in_call';

  useEffect(() => {
    if (voiceCall.isRinging) {
      setShowCallModal(true);
    }
  }, [voiceCall.isRinging]);

  useEffect(() => {
    if (!isCallOngoing) {
      setCallStartedAt(null);
      setCallDurationSec(0);
      setShowCallModal(true);
      return;
    }

    if (!isCallConnected) {
      setCallStartedAt(null);
      setCallDurationSec(0);
      return;
    }

    setCallStartedAt((prev) => prev ?? Date.now());
  }, [isCallConnected, isCallOngoing]);

  useEffect(() => {
    if (!isCallConnected || !callStartedAt) {
      setCallDurationSec(0);
      return;
    }

    const tick = () => {
      setCallDurationSec(Math.floor((Date.now() - callStartedAt) / 1000));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [isCallConnected, callStartedAt]);

  const activeCallUser = useMemo(() => {
    const targetId = voiceCall.activePeerUserId ?? voiceCall.incomingPeerUserId;
    if (!targetId) return null;

    const conv = conversations.find((c) => c.user.id === targetId);
    const name = conv?.user.name || voiceCall.incomingFromUsername || 'Người dùng';
    const avatar =
      conv?.user.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

    return { id: targetId, name, avatar };
  }, [conversations, voiceCall.activePeerUserId, voiceCall.incomingFromUsername, voiceCall.incomingPeerUserId]);

  const formatCallDuration = (totalSec: number) => {
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const callStatusText =
    voiceCall.status === 'calling'
      ? 'Đang gọi...'
      : voiceCall.status === 'connecting'
        ? 'Đang kết nối...'
        : formatCallDuration(callDurationSec);
  const isVideoCall = isCallOngoing && voiceCall.callMediaType === 'video';
  const isIncomingVideoCall = voiceCall.isRinging && voiceCall.incomingMediaType === 'video';

  const showMinimizedCallBar = !showCallModal && (voiceCall.isRinging || isCallOngoing);
  const minimizedCallUser = voiceCall.isRinging ? incomingCallUser : activeCallUser;
  const isMinimizedIncoming = voiceCall.isRinging;
  const isMinimizedInCall = isCallOngoing && voiceCall.status === 'in_call';
  const isMinimizedOutgoing = isCallOngoing && voiceCall.status !== 'in_call';

  return (
    <div
      className="h-screen bg-gray-100 overflow-hidden"
      style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
    >
      <Header />
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {voiceCall.isRinging && incomingCallUser && showCallModal && (
        <div className="fixed inset-0 z-[130] bg-black/20 flex items-center justify-center">
          <div
            className="w-[340px] rounded-2xl bg-white border border-gray-200 shadow-2xl p-5"
            style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
          >
            <div className="flex justify-end">
              <button
                onClick={() => setShowCallModal(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                title="Thu gọn cuộc gọi"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="text-center">
              <img
                src={incomingCallUser.avatar}
                alt={incomingCallUser.name}
                className="w-20 h-20 rounded-full object-cover mx-auto"
              />
              <p className="mt-3 text-lg font-semibold text-gray-900">{incomingCallUser.name}</p>
              <p className="mt-1 text-sm text-gray-500">
                {isIncomingVideoCall ? 'Đang gọi video cho bạn' : 'Đang gọi thoại cho bạn'}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={handleRejectIncomingCall}
                className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center"
                title="Từ chối"
              >
                <PhoneOff className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={handleAcceptIncomingCall}
                className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
                title="Nghe máy"
              >
                <Phone className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}


      {isCallOngoing && activeCallUser && showCallModal && (
        <div className="fixed inset-0 z-[130] bg-black/20 flex items-center justify-center">
          <div
            className={`rounded-2xl bg-white border border-gray-200 shadow-2xl p-5 ${
              isVideoCall ? 'w-[680px]' : 'w-[340px]'
            }`}
            style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
          >
            <div className="flex justify-end">
              <button
                onClick={() => setShowCallModal(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                title="Thu gọn cuộc gọi"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {isVideoCall ? (
              <>
                <div className="relative overflow-hidden rounded-xl bg-black h-[360px]">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover bg-black"
                  />
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute bottom-3 right-3 w-40 h-28 object-cover rounded-lg border border-white/40 bg-gray-900"
                  />
                  {!voiceCall.remoteStream && (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                      Đang chờ video...
                    </div>
                  )}
                </div>
                <div className="mt-3 text-center">
                  <p className="text-lg font-semibold text-gray-900">{activeCallUser.name}</p>
                  <p className="mt-1 text-sm text-gray-500">{callStatusText}</p>
                </div>
              </>
            ) : (
              <div className="text-center -mt-1">
                <img
                  src={activeCallUser.avatar}
                  alt={activeCallUser.name}
                  className="w-20 h-20 rounded-full object-cover mx-auto"
                />
                <p className="mt-3 text-lg font-semibold text-gray-900">{activeCallUser.name}</p>
                <p className="mt-1 text-sm text-gray-500">{callStatusText}</p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={() =>
                  setSpeakerMode((prev) => (prev === 'outer' ? 'inner' : 'outer'))
                }
                className={`w-12 h-12 rounded-full transition-colors flex items-center justify-center ${
                  speakerMode === 'outer'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
                title={
                  speakerMode === 'outer'
                    ? 'Đang loa ngoài, bấm để chuyển loa trong'
                    : 'Đang loa trong, bấm để chuyển loa ngoài'
                }
              >
                {speakerMode === 'outer' ? (
                  <Volume2 className="w-5 h-5 text-white" />
                ) : (
                  <Volume1 className="w-5 h-5 text-gray-700" />
                )}
              </button>

              {isVideoCall && (
                <button
                  onClick={handleToggleCamera}
                  className={`w-12 h-12 rounded-full transition-colors flex items-center justify-center ${
                    voiceCall.isCameraEnabled
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  title={voiceCall.isCameraEnabled ? 'Tắt camera' : 'Bật camera'}
                >
                  {voiceCall.isCameraEnabled ? (
                    <Video className="w-5 h-5 text-white" />
                  ) : (
                    <VideoOff className="w-5 h-5 text-gray-700" />
                  )}
                </button>
              )}

              {voiceCall.status === 'in_call' && (
                <button
                  onClick={handleToggleMute}
                  className={`w-12 h-12 rounded-full transition-colors flex items-center justify-center ${
                    voiceCall.isMuted
                      ? 'bg-gray-100 hover:bg-gray-200'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  title={voiceCall.isMuted ? 'Bật mic' : 'Tắt mic'}
                >
                  {voiceCall.isMuted ? (
                    <MicOff className="w-5 h-5 text-gray-700" />
                  ) : (
                    <Mic className="w-5 h-5 text-white" />
                  )}
                </button>
              )}

              <button
                onClick={handleEndVoiceCall}
                className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center"
                title="Kết thúc cuộc gọi"
              >
                <PhoneOff className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}


      <div className="flex h-[calc(100vh-56px)] mt-14 overflow-hidden p-2 gap-2">
        <div
          className={`bg-white border border-gray-200 rounded-xl flex flex-col transition-all duration-300 ease-in-out ${
            activeChatUser ? 'w-0 -translate-x-full lg:w-[380px] lg:translate-x-0' : 'w-[380px]'
          }`}
        >
          <div className="flex flex-col h-full min-w-[380px]">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h1 className="text-[1.75rem] font-semibold tracking-tight">Đoạn chat</h1>
                  <span
                    className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`}
                    title={connected ? 'Đã kết nối realtime' : 'Chưa kết nối'}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadFriends}
                    disabled={loadingConversations}
                    className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-50"
                    title="Tải lại danh sách"
                  >
                    <RefreshCw className={`w-5 h-5 text-gray-600 ${loadingConversations ? 'animate-spin' : ''}`} />
                  </button>
                  <button className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                    <MoreHorizontal className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                    <Edit className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm trên Messenger"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm outline-none focus:bg-gray-200 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeFilter === filter.key
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loadingConversations ? (
                <div className="text-center py-8 text-gray-400 text-sm">Đang tải...</div>
              ) : friendsError ? (
                <div className="text-center py-8 text-sm">
                  <p className="text-red-500 mb-2">Không thể tải danh sách bạn bè</p>
                  <button onClick={loadFriends} className="text-blue-500 hover:underline text-sm">
                    Thử lại
                  </button>
                </div>
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    onClick={() => handleConversationClick(conversation)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  {conversations.length === 0
                    ? 'Chưa có bạn bè nào. Kết bạn để bắt đầu chat.'
                    : 'Không tìm thấy cuộc trò chuyện'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 flex gap-2 relative">
          {activeChatUser ? (
            <div className="flex-1 min-w-0 relative">
              {showMinimizedCallBar && minimizedCallUser && (
                <div
                  onClick={() => setShowCallModal(true)}
                  className="absolute top-2 left-1/2 -translate-x-1/2 z-[90] w-[min(560px,calc(100%-20px))] bg-white border border-gray-200 shadow-lg rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer"
                  style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
                  title="Mở lại cuộc gọi"
                >
                  <img src={minimizedCallUser.avatar} alt={minimizedCallUser.name} className="w-8 h-8 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate max-w-[180px]">{minimizedCallUser.name}</p>
                    {isMinimizedIncoming ? (
                      <p className="text-xs text-gray-500">
                        {isIncomingVideoCall ? 'Đang có cuộc gọi video đến...' : 'Đang có cuộc gọi đến...'}
                      </p>
                    ) : isMinimizedInCall ? (
                      <p className="text-xs text-gray-500">{formatCallDuration(callDurationSec)}</p>
                    ) : (
                      <p className="text-xs text-gray-500">{callStatusText}</p>
                    )}
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    {isMinimizedIncoming ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectIncomingCall();
                          }}
                          className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center"
                          title="Từ chối"
                        >
                          <PhoneOff className="w-4 h-4 text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptIncomingCall();
                          }}
                          className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
                          title="Nghe máy"
                        >
                          <Phone className="w-4 h-4 text-white" />
                        </button>
                      </>
                    ) : isMinimizedInCall ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSpeakerMode((prev) => (prev === 'outer' ? 'inner' : 'outer'));
                          }}
                          className={`w-8 h-8 rounded-full transition-colors flex items-center justify-center ${
                            speakerMode === 'outer' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                          title={speakerMode === 'outer' ? 'Đang loa ngoài' : 'Đang loa trong'}
                        >
                          {speakerMode === 'outer' ? (
                            <Volume2 className="w-4 h-4 text-white" />
                          ) : (
                            <Volume1 className="w-4 h-4 text-gray-700" />
                          )}
                        </button>
                        {isVideoCall && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCamera();
                            }}
                            className={`w-8 h-8 rounded-full transition-colors flex items-center justify-center ${
                              voiceCall.isCameraEnabled
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                            title={voiceCall.isCameraEnabled ? 'Tắt camera' : 'Bật camera'}
                          >
                            {voiceCall.isCameraEnabled ? (
                              <Video className="w-4 h-4 text-white" />
                            ) : (
                              <VideoOff className="w-4 h-4 text-gray-700" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleMute();
                          }}
                          className={`w-8 h-8 rounded-full transition-colors flex items-center justify-center ${
                            voiceCall.isMuted ? 'bg-gray-100 hover:bg-gray-200' : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                          title={voiceCall.isMuted ? 'Bật mic' : 'Tắt mic'}
                        >
                          {voiceCall.isMuted ? (
                            <MicOff className="w-4 h-4 text-gray-700" />
                          ) : (
                            <Mic className="w-4 h-4 text-white" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEndVoiceCall();
                          }}
                          className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center"
                          title="Kết thúc cuộc gọi"
                        >
                          <PhoneOff className="w-4 h-4 text-white" />
                        </button>
                      </>
                    ) : isMinimizedOutgoing ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSpeakerMode((prev) => (prev === 'outer' ? 'inner' : 'outer'));
                          }}
                          className={`w-8 h-8 rounded-full transition-colors flex items-center justify-center ${
                            speakerMode === 'outer' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                          title={speakerMode === 'outer' ? 'Đang loa ngoài' : 'Đang loa trong'}
                        >
                          {speakerMode === 'outer' ? (
                            <Volume2 className="w-4 h-4 text-white" />
                          ) : (
                            <Volume1 className="w-4 h-4 text-gray-700" />
                          )}
                        </button>
                        {isVideoCall && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCamera();
                            }}
                            className={`w-8 h-8 rounded-full transition-colors flex items-center justify-center ${
                              voiceCall.isCameraEnabled
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                            title={voiceCall.isCameraEnabled ? 'Tắt camera' : 'Bật camera'}
                          >
                            {voiceCall.isCameraEnabled ? (
                              <Video className="w-4 h-4 text-white" />
                            ) : (
                              <VideoOff className="w-4 h-4 text-gray-700" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEndVoiceCall();
                          }}
                          className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center"
                          title="Kết thúc cuộc gọi"
                        >
                          <PhoneOff className="w-4 h-4 text-white" />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              <ChatWindow
                user={activeChatUser}
                messages={activeMessages}
                loading={loadingMessages}
                connected={connected}
                onSendMessage={handleSendMessage}
                onReactMessage={handleReactMessage}
                onClose={handleBackToList}
                onMinimize={handleBackToList}
                fullScreen
                callStatus={activeWindowCallStatus}
                callMediaType={voiceCall.callMediaType}
                isMuted={voiceCall.isMuted}
                canStartVoiceCall={
                  !voiceCall.hasActiveCall && !voiceCall.isRinging
                    ? true
                    : voiceCall.activePeerUserId === activeChatUser.id
                }
                canStartVideoCall={!voiceCall.hasActiveCall && !voiceCall.isRinging}
                onStartVoiceCall={handleStartVoiceCall}
                onStartVideoCall={handleStartVideoCall}
                onEndVoiceCall={handleEndVoiceCall}
                onToggleMute={handleToggleMute}
                onCallAgain={handleCallAgain}
              />
            </div>
          ) : activeChatUserId && loadingConversations ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
              Đang tải...
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-gray-200">
              <div className="text-center px-6">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Edit className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Tin nhắn của bạn</h2>
                <p className="text-gray-500 text-sm">Chọn một cuộc trò chuyện để bắt đầu nhắn tin</p>
              </div>
            </div>
          )}

          {activeChatUser && <ChatInfoPanel user={activeChatUser} />}
        </div>
      </div>
    </div>
  );
}

