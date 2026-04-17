import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  MoreHorizontal,
  Edit,
  RefreshCw,
  BellOff,
  ChevronDown,
  Search as SearchIcon,
} from 'lucide-react';
import { Header } from '../../home/components';
import { ConversationItem, ChatWindow } from '../components';
import { Conversation, MessengerFilter } from '../types/messenger.types';
import { ChatUser, IncomingChatMessage, IncomingMessageStatus, Message } from '../types/message.types';
import { useFriendConversations } from '../hooks/useFriendConversations';
import { authService } from '@/services/authService';
import { chatService } from '@/services/chatService';
import { useRealtimeCall } from '@/contexts/RealtimeCallContext';
import { formatLastActiveLabel } from '../utils/presenceLabel';

const CALL_LOG_PREFIX = '__CALL_LOG__:';
const HISTORY_PAGE_SIZE = 30;

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

function resolveDeliveryStatus(delivered?: boolean, seen?: boolean): Message['deliveryStatus'] {
  if (seen) return 'SEEN';
  if (delivered) return 'DELIVERED';
  return 'SENT';
}

function mapIncomingToMessage(raw: IncomingChatMessage, currentUserId?: string | null): Message {
  return {
    ...mapBackendContentToMessageFields(raw.content),
    id: raw.id,
    senderId: raw.senderId,
    timestamp: new Date(raw.createdAt),
    isOwn: raw.senderId === currentUserId,
    deliveryStatus: resolveDeliveryStatus(raw.delivered, raw.seen),
    seenAt: raw.seenAt,
    deleted: raw.deleted,
    deletedAt: raw.deletedAt,
    reactions: raw.reactions ?? [],
  };
}

interface HistoryState {
  initialized: boolean;
  loadingInitial: boolean;
  loadingOlder: boolean;
  hasMore: boolean;
  nextBeforeCreatedAt: string | null;
}

function defaultHistoryState(): HistoryState {
  return {
    initialized: false,
    loadingInitial: false,
    loadingOlder: false,
    hasMore: true,
    nextBeforeCreatedAt: null,
  };
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
        <p className="text-sm text-gray-500">{formatLastActiveLabel(user.isOnline, user.lastActiveAt)}</p>
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
  const [historyByUser, setHistoryByUser] = useState<Record<string, HistoryState>>({});
  const [presenceByUser, setPresenceByUser] = useState<Record<string, { online: boolean; lastActiveAt?: string }>>({});
  const [, setPresenceClockTick] = useState(0);
  const [activeFilter, setActiveFilter] = useState<MessengerFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const callRecorderRef = useRef<MediaRecorder | null>(null);
  const callRecorderChunksRef = useRef<Blob[]>([]);
  const callRecorderAudioCtxRef = useRef<AudioContext | null>(null);
  const callRecorderMetaRef = useRef<{ callId: string; startedAt: number; mediaType: 'audio' | 'video' } | null>(null);
  const callRecorderCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const callRecorderCanvasStreamRef = useRef<MediaStream | null>(null);
  const callRecorderAnimationFrameRef = useRef<number | null>(null);
  const callRecorderVideoElementsRef = useRef<{ local: HTMLVideoElement | null; remote: HTMLVideoElement | null }>({
    local: null,
    remote: null,
  });
  const isUploadingRecordingRef = useRef(false);
  const initialHistoryInFlightRef = useRef<Set<string>>(new Set());
  const olderHistoryInFlightRef = useRef<Set<string>>(new Set());
  const pendingMessageStatusRef = useRef<
    Record<string, { status: IncomingMessageStatus['status']; updatedAt?: string }>
  >({});

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setPresenceClockTick((prev) => prev + 1);
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const conversations: Conversation[] = baseConversations.map((c) => ({
    ...c,
    user: {
      ...c.user,
      isOnline: presenceByUser[c.user.id]?.online ?? false,
      lastActiveAt: presenceByUser[c.user.id]?.lastActiveAt,
    },
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
      isOnline: presenceByUser[conv.user.id]?.online ?? false,
      lastActiveAt: presenceByUser[conv.user.id]?.lastActiveAt,
    };
  }, [activeChatUserId, baseConversations, presenceByUser]);

  const loadInitialHistory = useCallback(
    async (peerUserId: string) => {
      if (!currentUser?.id) return;
      if (initialHistoryInFlightRef.current.has(peerUserId)) return;
      const current = historyByUser[peerUserId] ?? defaultHistoryState();
      if (current.initialized || current.loadingInitial) return;
      initialHistoryInFlightRef.current.add(peerUserId);

      setHistoryByUser((prev) => ({
        ...prev,
        [peerUserId]: {
          ...(prev[peerUserId] ?? defaultHistoryState()),
          loadingInitial: true,
        },
      }));

      try {
        const historyPage = await chatService.getChatHistory(currentUser.id, peerUserId, {
          limit: HISTORY_PAGE_SIZE,
        });
        const msgs = historyPage.messages.map((m) => mapIncomingToMessage(m, currentUser.id));
        setMessagesByUser((prev) => ({ ...prev, [peerUserId]: msgs }));
        setHistoryByUser((prev) => ({
          ...prev,
          [peerUserId]: {
            initialized: true,
            loadingInitial: false,
            loadingOlder: false,
            hasMore: historyPage.hasMore,
            nextBeforeCreatedAt: historyPage.nextBeforeCreatedAt ?? null,
          },
        }));

        if (msgs.length > 0) {
          const last = msgs[msgs.length - 1];
          setOverrides((prev) => ({
            ...prev,
            [peerUserId]: {
              ...(prev[peerUserId] ?? {}),
              lastMessage: formatConversationPreview(last.text, last.isOwn),
              timestamp: last.timestamp.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            },
          }));
        }
      } catch {
        setHistoryByUser((prev) => ({
          ...prev,
          [peerUserId]: {
            ...(prev[peerUserId] ?? defaultHistoryState()),
            loadingInitial: false,
          },
        }));
      } finally {
        initialHistoryInFlightRef.current.delete(peerUserId);
      }
    },
    [currentUser?.id, historyByUser],
  );

  const loadOlderHistory = useCallback(
    async (peerUserId: string) => {
      if (!currentUser?.id) return;
      if (olderHistoryInFlightRef.current.has(peerUserId)) return;
      const current = historyByUser[peerUserId] ?? defaultHistoryState();
      if (!current.initialized || current.loadingOlder || !current.hasMore) return;
      olderHistoryInFlightRef.current.add(peerUserId);

      const beforeCreatedAt = current.nextBeforeCreatedAt;
      setHistoryByUser((prev) => ({
        ...prev,
        [peerUserId]: {
          ...(prev[peerUserId] ?? defaultHistoryState()),
          loadingOlder: true,
        },
      }));
      if (!beforeCreatedAt) {
        setHistoryByUser((prev) => ({
          ...prev,
          [peerUserId]: {
            ...(prev[peerUserId] ?? defaultHistoryState()),
            loadingOlder: false,
            hasMore: false,
          },
        }));
        olderHistoryInFlightRef.current.delete(peerUserId);
        return;
      }

      try {
        const historyPage = await chatService.getChatHistory(currentUser.id, peerUserId, {
          limit: HISTORY_PAGE_SIZE,
          beforeCreatedAt,
        });
        const olderMessages = historyPage.messages.map((m) => mapIncomingToMessage(m, currentUser.id));
        const existingMessages = messagesByUser[peerUserId] ?? [];
        const existingIds = new Set(existingMessages.map((m) => m.id));
        const dedupOlder = olderMessages.filter((m) => !existingIds.has(m.id));
        setMessagesByUser((prev) => {
          const existing = prev[peerUserId] ?? [];
          if (dedupOlder.length === 0) return prev;
          return { ...prev, [peerUserId]: [...dedupOlder, ...existing] };
        });

        setHistoryByUser((prev) => ({
          ...prev,
          [peerUserId]: {
            ...(prev[peerUserId] ?? defaultHistoryState()),
            loadingOlder: false,
            hasMore: dedupOlder.length > 0 && historyPage.hasMore,
            nextBeforeCreatedAt: historyPage.nextBeforeCreatedAt ?? null,
          },
        }));
      } catch {
        setHistoryByUser((prev) => ({
          ...prev,
          [peerUserId]: {
            ...(prev[peerUserId] ?? defaultHistoryState()),
            loadingOlder: false,
          },
        }));
      } finally {
        olderHistoryInFlightRef.current.delete(peerUserId);
      }
    },
    [currentUser?.id, historyByUser, messagesByUser],
  );

  useEffect(() => {
    if (!activeChatUserId) return;
    void loadInitialHistory(activeChatUserId);
  }, [activeChatUserId, loadInitialHistory]);

  const {
    connected,
    sendMessage,
    voiceCall,
    subscribeMessages,
    subscribeMessageStatuses,
    subscribePresenceStatuses,
    sendMessageDelivered,
    sendConversationSeen,
  } = useRealtimeCall();

  const handleIncomingMessage = useCallback(
    (msg: IncomingChatMessage) => {
      console.log("🔥 incoming", msg);
      const myId = currentUser?.id;
      const otherUserId = msg.senderId === myId ? msg.receiverId : msg.senderId;
      const pendingStatus = pendingMessageStatusRef.current[msg.id];
      const newMsgBase = mapIncomingToMessage(msg, myId);
      const newMsg = pendingStatus
        ? {
            ...newMsgBase,
            deliveryStatus: pendingStatus.status === 'SEEN' ? 'SEEN' : 'DELIVERED',
            seenAt: pendingStatus.status === 'SEEN' ? pendingStatus.updatedAt : newMsgBase.seenAt,
          }
        : newMsgBase;
      if (pendingStatus) {
        delete pendingMessageStatusRef.current[msg.id];
      }

      setMessagesByUser((prev) => ({
        ...prev,
        [otherUserId]: (() => {
          const existing = prev[otherUserId] ?? [];
          const existingIndex = existing.findIndex((m) => m.id === newMsg.id);
          if (existingIndex === -1) {
            return [...existing, newMsg];
          }
          const next = [...existing];
          next[existingIndex] = { ...next[existingIndex], ...newMsg };
          return next;
        })(),
      }));

      setOverrides((prev) => ({
        ...prev,
        [otherUserId]: {
          ...(prev[otherUserId] ?? {}),
          lastMessage: formatConversationPreview(newMsg.text, msg.senderId === myId),
          timestamp: 'Vừa xong',
          isUnread: activeChatUserId !== otherUserId,
        },
      }));

      if (msg.senderId !== myId) {
        sendMessageDelivered(msg.id);
        if (activeChatUserId === otherUserId) {
          sendConversationSeen(otherUserId);
        }
      }
    },
    [activeChatUserId, currentUser?.id, sendConversationSeen, sendMessageDelivered],
  );

  useEffect(() => {
    return subscribeMessages((signalMessage) => {
      handleIncomingMessage(signalMessage);
    });
  }, [handleIncomingMessage, subscribeMessages]);

  const handleIncomingMessageStatus = useCallback((status: IncomingMessageStatus) => {
    let hasMatchedMessage = false;
    setMessagesByUser((prev) => {
      const next: Record<string, Message[]> = {};
      let changed = false;

      for (const [peerId, messages] of Object.entries(prev)) {
        let peerChanged = false;
        const updated = messages.map((message) => {
          if (message.id !== status.messageId) return message;
          const nextStatus: Message['deliveryStatus'] =
            status.status === 'SEEN' ? 'SEEN' : 'DELIVERED';
          peerChanged = true;
          changed = true;
          hasMatchedMessage = true;
          return {
            ...message,
            deliveryStatus: nextStatus,
            seenAt: status.status === 'SEEN' ? status.updatedAt : message.seenAt,
          };
        });
        next[peerId] = peerChanged ? updated : messages;
      }

      return changed ? next : prev;
    });
    if (!hasMatchedMessage) {
      pendingMessageStatusRef.current[status.messageId] = {
        status: status.status,
        updatedAt: status.updatedAt,
      };
    }
  }, []);

  useEffect(() => {
    return subscribeMessageStatuses((status) => {
      handleIncomingMessageStatus(status);
    });
  }, [handleIncomingMessageStatus, subscribeMessageStatuses]);

  useEffect(() => {
    return subscribePresenceStatuses((presence) => {
      setPresenceByUser((prev) => {
        const current = prev[presence.userId];
        if (current?.online === presence.online && current?.lastActiveAt === presence.lastActiveAt) {
          return prev;
        }
        return {
          ...prev,
          [presence.userId]: {
            online: presence.online,
            lastActiveAt: presence.lastActiveAt,
          },
        };
      });
    });
  }, [subscribePresenceStatuses]);

  useEffect(() => {
    if (!activeChatUserId) return;
    if (!connected) return;
    sendConversationSeen(activeChatUserId);
  }, [activeChatUserId, connected, sendConversationSeen]);

  useEffect(() => {
    if (!activeChatUserId || !connected) return;
    const intervalId = window.setInterval(() => {
      sendConversationSeen(activeChatUserId);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [activeChatUserId, connected, sendConversationSeen]);

  const stopAndUploadCallRecording = useCallback(
    async (finalCallId?: string | null) => {
      if (callRecorderAnimationFrameRef.current) {
        window.cancelAnimationFrame(callRecorderAnimationFrameRef.current);
        callRecorderAnimationFrameRef.current = null;
      }
      callRecorderCanvasStreamRef.current?.getTracks().forEach((track) => track.stop());
      callRecorderCanvasStreamRef.current = null;
      callRecorderCanvasRef.current = null;
      const localVideo = callRecorderVideoElementsRef.current.local;
      const remoteVideo = callRecorderVideoElementsRef.current.remote;
      if (localVideo) {
        localVideo.pause();
        localVideo.srcObject = null;
      }
      if (remoteVideo) {
        remoteVideo.pause();
        remoteVideo.srcObject = null;
      }
      callRecorderVideoElementsRef.current = { local: null, remote: null };

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
      if (remoteVideoTrack || localVideoTrack) {
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          const localVideo = document.createElement('video');
          localVideo.playsInline = true;
          localVideo.muted = true;
          localVideo.autoplay = true;
          if (localStream) {
            localVideo.srcObject = localStream;
            void localVideo.play().catch(() => {});
          }

          const remoteVideo = document.createElement('video');
          remoteVideo.playsInline = true;
          remoteVideo.muted = true;
          remoteVideo.autoplay = true;
          if (remoteStream) {
            remoteVideo.srcObject = remoteStream;
            void remoteVideo.play().catch(() => {});
          }

          callRecorderVideoElementsRef.current = { local: localVideo, remote: remoteVideo };
          callRecorderCanvasRef.current = canvas;

          const drawFrame = () => {
            const w = canvas.width;
            const h = canvas.height;

            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);

            const hasRemoteFrame =
              Boolean(remoteVideoTrack) && remoteVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
            const hasLocalFrame =
              Boolean(localVideoTrack) && localVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;

            if (hasRemoteFrame) {
              ctx.drawImage(remoteVideo, 0, 0, w, h);
            } else if (hasLocalFrame) {
              ctx.drawImage(localVideo, 0, 0, w, h);
            }

            if (hasLocalFrame && hasRemoteFrame) {
              const pipW = Math.floor(w * 0.26);
              const pipH = Math.floor(h * 0.26);
              const pipX = w - pipW - 24;
              const pipY = h - pipH - 24;

              ctx.fillStyle = 'rgba(0,0,0,0.35)';
              ctx.fillRect(pipX - 4, pipY - 4, pipW + 8, pipH + 8);
              ctx.drawImage(localVideo, pipX, pipY, pipW, pipH);
            }

            callRecorderAnimationFrameRef.current = window.requestAnimationFrame(drawFrame);
          };

          drawFrame();

          const canvasStream = canvas.captureStream(30);
          callRecorderCanvasStreamRef.current = canvasStream;
          const composedVideoTrack = canvasStream.getVideoTracks()[0];
          if (composedVideoTrack) {
            recordingStream.addTrack(composedVideoTrack);
          }
        } else {
          const fallbackTrack = remoteVideoTrack ?? localVideoTrack;
          if (fallbackTrack) {
            recordingStream.addTrack(fallbackTrack);
          }
        }
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
    void voiceCall.startCall(activeChatUserId, 'audio', activeChatUser?.name, activeChatUser?.avatar);
  }, [activeChatUser?.avatar, activeChatUser?.name, activeChatUserId, voiceCall]);

  const handleStartVideoCall = useCallback(() => {
    if (!activeChatUserId) return;
    void voiceCall.startCall(activeChatUserId, 'video', activeChatUser?.name, activeChatUser?.avatar);
  }, [activeChatUser?.avatar, activeChatUser?.name, activeChatUserId, voiceCall]);

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

  const handleReactMessage = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        await chatService.updateMessageReaction(messageId, emoji || null);
      } catch {
        // keep old state when update fails
      }
    },
    [],
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      try {
        await chatService.deleteMessage(messageId);
      } catch {
        // keep old state when delete fails
      }
    },
    [],
  );

  const handleReportMessage = useCallback(async (messageId: string) => {
    try {
      await chatService.reportMessage(messageId, 'reported-from-messenger-ui');
      return true;
    } catch {
      return false;
    }
  }, []);

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
  const activeHistory = activeChatUserId ? historyByUser[activeChatUserId] : undefined;
  const loadingMessages = Boolean(activeChatUserId && activeHistory?.loadingInitial && activeMessages.length === 0);
  const loadingOlderMessages = Boolean(activeChatUserId && activeHistory?.loadingOlder);
  const hasOlderMessages = Boolean(activeChatUserId && activeHistory?.hasMore);

  const handleLoadOlderMessages = useCallback(async () => {
    if (!activeChatUserId) return;
    await loadOlderHistory(activeChatUserId);
  }, [activeChatUserId, loadOlderHistory]);

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

  return (
    <div
      className="h-screen bg-gray-100 overflow-hidden"
      style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
    >
      <Header />


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
              <ChatWindow
                user={activeChatUser}
                messages={activeMessages}
                loading={loadingMessages}
                loadingOlder={loadingOlderMessages}
                hasOlder={hasOlderMessages}
                connected={connected}
                onSendMessage={handleSendMessage}
                onLoadOlder={handleLoadOlderMessages}
                onReactMessage={handleReactMessage}
                onDeleteMessage={handleDeleteMessage}
                onReportMessage={handleReportMessage}
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

