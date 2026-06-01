import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AUTH_USER_CHANGED_EVENT, authService } from '@/services/authService';
import { FRIENDSHIP_CHANGED_EVENT } from '@/services/friendService';
import { toast } from 'sonner';
import { chatService } from '@/services/chatService';
import { CallMinimizedBar, CallOverlayModal } from '@/features/messenger/components';
import { useChatSocket } from '@/features/messenger/hooks/useChatSocket';
import { useVoiceCall } from '@/features/messenger/hooks/useVoiceCall';
import { calculateCallDurationSeconds, normalizeCallDurationSeconds } from '@/features/messenger/utils/callDuration';
import type {
  IncomingCallError,
  IncomingChatError,
  IncomingCallSignal,
  IncomingChatMessage,
  IncomingMessageStatus,
  IncomingPinnedMessage,
  IncomingPresenceStatus,
  IncomingNotificationEvent,
} from '@/features/messenger/types/message.types';

type MessageListener = (msg: IncomingChatMessage) => void;
type MessageStatusListener = (status: IncomingMessageStatus) => void;
type PresenceStatusListener = (status: IncomingPresenceStatus) => void;
type PinnedMessageListener = (event: IncomingPinnedMessage) => void;
type NotificationEventListener = (event: IncomingNotificationEvent) => void;
type ChatErrorListener = (error: IncomingChatError) => void;

interface RealtimeCallContextValue {
  connected: boolean;
  sendMessage: (receiverId: string, content: string) => void;
  sendGroupMessage: (conversationId: string, content: string) => void;
  voiceCall: ReturnType<typeof useVoiceCall>;
  subscribeMessages: (listener: MessageListener) => () => void;
  subscribeMessageStatuses: (listener: MessageStatusListener) => () => void;
  subscribePresenceStatuses: (listener: PresenceStatusListener) => () => void;
  subscribePinnedMessages: (listener: PinnedMessageListener) => () => void;
  subscribeNotificationEvents: (listener: NotificationEventListener) => () => void;
  subscribeChatErrors: (listener: ChatErrorListener) => () => void;
  sendMessageDelivered: (messageId: string) => void;
  sendConversationSeen: (peerUserId: string) => void;
}

interface PeerProfile {
  fullName: string;
  avatarUrl?: string;
}

const RealtimeCallContext = createContext<RealtimeCallContextValue | null>(null);

export function RealtimeCallProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());

  useEffect(() => {
    const syncAuth = () => {
      setCurrentUser(authService.getCurrentUser());
    };
    window.addEventListener(AUTH_USER_CHANGED_EVENT, syncAuth);
    return () => window.removeEventListener(AUTH_USER_CHANGED_EVENT, syncAuth);
  }, []);

  const navigate = useNavigate();
  const listenersRef = useRef<Set<MessageListener>>(new Set());
  const statusListenersRef = useRef<Set<MessageStatusListener>>(new Set());
  const presenceListenersRef = useRef<Set<PresenceStatusListener>>(new Set());
  const pinnedMessageListenersRef = useRef<Set<PinnedMessageListener>>(new Set());
  const notificationEventListenersRef = useRef<Set<NotificationEventListener>>(new Set());
  const chatErrorListenersRef = useRef<Set<ChatErrorListener>>(new Set());
  const latestPresenceByUserRef = useRef<Record<string, IncomingPresenceStatus>>({});
  const callSignalHandlerRef = useRef<(signal: IncomingCallSignal) => void>(() => {});
  const callErrorHandlerRef = useRef<(error: IncomingCallError) => void>(() => {});
  const desktopNotificationRef = useRef<Notification | null>(null);
  const notifiedCallIdRef = useRef<string | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [showCallModal, setShowCallModal] = useState(true);
  const [speakerMode, setSpeakerMode] = useState<'inner' | 'outer'>('inner');
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [authoritativeStatusText, setAuthoritativeStatusText] = useState<string | null>(null);
  const [peerProfiles, setPeerProfiles] = useState<Record<string, PeerProfile>>({});
  const peerProfileLoadingRef = useRef<Set<string>>(new Set());

  const formatCallDuration = useCallback((totalSec: number) => {
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }, []);

  const handleIncomingMessage = useCallback((msg: IncomingChatMessage) => {
    listenersRef.current.forEach((listener) => listener(msg));
  }, []);

  const handleIncomingMessageStatus = useCallback((status: IncomingMessageStatus) => {
    statusListenersRef.current.forEach((listener) => listener(status));
  }, []);

  const handleIncomingPresenceStatus = useCallback((status: IncomingPresenceStatus) => {
    latestPresenceByUserRef.current[status.userId] = status;
    presenceListenersRef.current.forEach((listener) => listener(status));
  }, []);

  const handleIncomingPinnedMessage = useCallback((event: IncomingPinnedMessage) => {
    pinnedMessageListenersRef.current.forEach((listener) => listener(event));
  }, []);

  const handleIncomingNotificationEvent = useCallback((event: IncomingNotificationEvent) => {
    notificationEventListenersRef.current.forEach((listener) => listener(event));
    if (event.notificationType === 'FRIEND_REQUEST') {
      window.dispatchEvent(new Event(FRIENDSHIP_CHANGED_EVENT));
    }
  }, []);

  const closeDesktopNotification = useCallback(() => {
    desktopNotificationRef.current?.close();
    desktopNotificationRef.current = null;
    notifiedCallIdRef.current = null;
  }, []);

  const maybeShowDesktopNotification = useCallback(
    async (signal: IncomingCallSignal) => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (signal.type !== 'CALL_INVITE') return;
      if (!currentUser?.id) return;
      if (signal.fromUserId === currentUser.id || signal.toUserId !== currentUser.id) return;
      if (notifiedCallIdRef.current === signal.callId) return;

      const isBackground = document.visibilityState !== 'visible' || !document.hasFocus();
      if (!isBackground) return;

      let permission = Notification.permission;
      if (permission === 'default') {
        try {
          permission = await Notification.requestPermission();
        } catch {
          return;
        }
      }
      if (permission !== 'granted') return;

      closeDesktopNotification();
      const isGroupCall = Boolean(signal.conversationId);
      let callerName = isGroupCall
        ? signal.conversationName || 'Cuộc gọi nhóm'
        : peerProfiles[signal.fromUserId]?.fullName || signal.fromUsername || 'Người dùng';
      if (!isGroupCall && !peerProfiles[signal.fromUserId] && !peerProfileLoadingRef.current.has(signal.fromUserId)) {
        peerProfileLoadingRef.current.add(signal.fromUserId);
        try {
          const profile = await authService.getUserById(signal.fromUserId);
          const resolvedName = profile.fullName || profile.username || 'Người dùng';
          callerName = resolvedName;
          setPeerProfiles((prev) => ({
            ...prev,
            [signal.fromUserId]: {
              fullName: resolvedName,
              avatarUrl: profile.avatarUrl,
            },
          }));
        } catch {
          // keep fallback display name
        } finally {
          peerProfileLoadingRef.current.delete(signal.fromUserId);
        }
      }

      const notif = new Notification(
        signal.mediaType === 'video' ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến',
        {
          body: isGroupCall ? `${callerName} đang gọi nhóm cho bạn` : `${callerName} đang gọi cho bạn`,
          tag: `call-${signal.callId}`,
          requireInteraction: true,
        },
      );

      notif.onclick = () => {
        window.focus();
        setShowCallModal(true);
        navigate(`/messages?with=${isGroupCall ? `group:${signal.conversationId}` : signal.fromUserId}`);
        notif.close();
      };
      notif.onclose = () => {
        if (desktopNotificationRef.current === notif) {
          desktopNotificationRef.current = null;
          notifiedCallIdRef.current = null;
        }
      };

      desktopNotificationRef.current = notif;
      notifiedCallIdRef.current = signal.callId;
    },
    [closeDesktopNotification, currentUser?.id, navigate, peerProfiles],
  );

  const handleIncomingCallSignal = useCallback(
    (signal: IncomingCallSignal) => {
      void maybeShowDesktopNotification(signal);
      if (signal.type === 'CALL_CANCEL' || signal.type === 'CALL_REJECT' || signal.type === 'CALL_END') {
        closeDesktopNotification();
      }
      callSignalHandlerRef.current(signal);
    },
    [closeDesktopNotification, maybeShowDesktopNotification],
  );

  const handleIncomingCallError = useCallback((error: IncomingCallError) => {
    if (error?.message) {
      toast.error(error.message);
    }
    callErrorHandlerRef.current(error);
  }, []);

  const handleIncomingChatError = useCallback((error: IncomingChatError) => {
    let msg: string;
    switch (error.code) {
      case 'CHAT_RATE_LIMITED':
        msg = error.retryAfterSeconds
          ? `Bạn đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau ${error.retryAfterSeconds} giây.`
          : 'Bạn đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau.';
        break;
      case 'CHAT_BLOCKED_KEYWORD':
        msg = 'Tin nhắn chứa nội dung không phù hợp nên không thể gửi.';
        break;
      case 'CHAT_MALICIOUS_LINK':
        msg = 'Tin nhắn chứa liên kết không an toàn nên đã bị chặn.';
        break;
      case 'CHAT_RESTRICTED':
        msg = 'Bạn đang bị tạm khóa tính năng chat. Vui lòng thử lại sau.';
        break;
      default:
        msg = error.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.';
    }
    toast.error(msg);
    chatErrorListenersRef.current.forEach((listener) => listener(error));
  }, []);

  const { connected, sendMessage, sendGroupMessage, sendCallSignal, sendMessageDelivered, sendConversationSeen } = useChatSocket(
    currentUser?.token,
    handleIncomingMessage,
    handleIncomingCallSignal,
    handleIncomingCallError,
    handleIncomingMessageStatus,
    handleIncomingPresenceStatus,
    handleIncomingPinnedMessage,
    handleIncomingNotificationEvent,
    handleIncomingChatError,
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
    callErrorHandlerRef.current = (error: IncomingCallError) => {
      voiceCall.handleCallError(error);
    };
  }, [voiceCall.handleCallError]);

  const subscribeMessages = useCallback((listener: MessageListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const subscribeMessageStatuses = useCallback((listener: MessageStatusListener) => {
    statusListenersRef.current.add(listener);
    return () => {
      statusListenersRef.current.delete(listener);
    };
  }, []);

  const subscribePresenceStatuses = useCallback((listener: PresenceStatusListener) => {
    presenceListenersRef.current.add(listener);
    Object.values(latestPresenceByUserRef.current).forEach((presence) => listener(presence));
    return () => {
      presenceListenersRef.current.delete(listener);
    };
  }, []);

  const subscribePinnedMessages = useCallback((listener: PinnedMessageListener) => {
    pinnedMessageListenersRef.current.add(listener);
    return () => {
      pinnedMessageListenersRef.current.delete(listener);
    };
  }, []);

  const subscribeNotificationEvents = useCallback((listener: NotificationEventListener) => {
    notificationEventListenersRef.current.add(listener);
    return () => {
      notificationEventListenersRef.current.delete(listener);
    };
  }, []);

  const subscribeChatErrors = useCallback((listener: ChatErrorListener) => {
    chatErrorListenersRef.current.add(listener);
    return () => {
      chatErrorListenersRef.current.delete(listener);
    };
  }, []);

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
  }, [speakerMode]);

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

  const effectiveCallStatus =
    voiceCall.authoritativeSessionStatus === 'ONGOING' &&
    (voiceCall.status === 'calling' || voiceCall.status === 'connecting')
      ? 'in_call'
      : voiceCall.status;

  const isCallOngoing =
    effectiveCallStatus === 'calling' || effectiveCallStatus === 'connecting' || effectiveCallStatus === 'in_call';
  const isCallConnected = effectiveCallStatus === 'in_call';

  useEffect(() => {
    const peerIds = [
      voiceCall.incomingGroupConversationId ? null : voiceCall.incomingPeerUserId,
      voiceCall.activeGroupConversationId ? null : voiceCall.activePeerUserId,
    ].filter(
      (id): id is string => Boolean(id),
    );
    if (peerIds.length === 0) return;

    peerIds.forEach((peerId) => {
      if (peerProfiles[peerId] || peerProfileLoadingRef.current.has(peerId)) return;
      peerProfileLoadingRef.current.add(peerId);
      void (async () => {
        try {
          const profile = await authService.getUserById(peerId);
          setPeerProfiles((prev) => ({
            ...prev,
            [peerId]: {
              fullName: profile.fullName || profile.username || 'Người dùng',
              avatarUrl: profile.avatarUrl,
            },
          }));
        } catch {
          // keep fallback display name/avatar
        } finally {
          peerProfileLoadingRef.current.delete(peerId);
        }
      })();
    });
  }, [
    peerProfiles,
    voiceCall.activeGroupConversationId,
    voiceCall.activePeerUserId,
    voiceCall.incomingGroupConversationId,
    voiceCall.incomingPeerUserId,
  ]);

  useEffect(() => {
    if (voiceCall.isRinging) {
      setShowCallModal(true);
      setSpeakerMode(voiceCall.incomingMediaType === 'video' ? 'outer' : 'inner');
    } else {
      closeDesktopNotification();
    }
  }, [closeDesktopNotification, voiceCall.incomingMediaType, voiceCall.isRinging]);

  useEffect(() => {
    return () => {
      closeDesktopNotification();
    };
  }, [closeDesktopNotification]);

  useEffect(() => {
    if (!isCallOngoing) {
      setCallDurationSec(0);
      setShowCallModal(true);
      return;
    }
    if (!isCallConnected) {
      setCallDurationSec(0);
      return;
    }
  }, [isCallConnected, isCallOngoing]);

  useEffect(() => {
    if (!isCallConnected || !voiceCall.callStartedAtMs) {
      setCallDurationSec(0);
      return;
    }

    const tick = () => {
      setCallDurationSec(calculateCallDurationSeconds(voiceCall.callStartedAtMs));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [isCallConnected, voiceCall.callStartedAtMs]);

  useEffect(() => {
    if (!voiceCall.activeCallId) {
      setAuthoritativeStatusText(null);
      return;
    }

    let cancelled = false;
    const syncSession = async () => {
      try {
        const snapshot = voiceCall.activeGroupConversationId
          ? await chatService.getGroupCallSessionSnapshot(voiceCall.activeCallId)
          : await chatService.getCallSessionSnapshot(voiceCall.activeCallId);
        if (cancelled) return;

        voiceCall.syncAuthoritativeSession(snapshot);

        if (snapshot.status === 'RINGING') {
          setAuthoritativeStatusText('Đang gọi...');
          return;
        }

        if (snapshot.status === 'ONGOING') {
          if (!voiceCall.callStartedAtMs && typeof snapshot.durationSec === 'number' && Number.isFinite(snapshot.durationSec)) {
            const safeDuration = normalizeCallDurationSeconds(snapshot.durationSec);
            setCallDurationSec(safeDuration);
          }
          setAuthoritativeStatusText(null);
          return;
        }

        if (snapshot.status === 'MISSED') {
          setAuthoritativeStatusText('Cuộc gọi nhỡ');
          return;
        }

        if (snapshot.status === 'COMPLETED') {
          const safeDuration =
            typeof snapshot.durationSec === 'number' && Number.isFinite(snapshot.durationSec)
              ? normalizeCallDurationSeconds(snapshot.durationSec)
              : 0;
          setCallDurationSec(safeDuration);
          setAuthoritativeStatusText(formatCallDuration(safeDuration));
          return;
        }

        setAuthoritativeStatusText(null);
      } catch {
        // no-op
      }
    };

    void syncSession();
    const interval = window.setInterval(syncSession, isCallConnected ? 3000 : 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [
    formatCallDuration,
    isCallConnected,
    voiceCall.activeCallId,
    voiceCall.activeGroupConversationId,
    voiceCall.callStartedAtMs,
    voiceCall.syncAuthoritativeSession,
  ]);

  const callStatusText =
    authoritativeStatusText ||
    (effectiveCallStatus === 'calling'
      ? 'Đang gọi...'
      : effectiveCallStatus === 'connecting'
        ? 'Đang kết nối...'
        : formatCallDuration(callDurationSec));

  const incomingGroupCaller = voiceCall.incomingGroupConversationId
    ? voiceCall.groupCallParticipants.find((participant) => participant.userId === voiceCall.incomingPeerUserId)
    : undefined;
  const activeGroupCaller = voiceCall.activeGroupConversationId
    ? voiceCall.groupCallParticipants.find((participant) =>
        participant.userId === (voiceCall.activeCallDirection === 'outgoing' ? currentUser?.id : voiceCall.activePeerUserId),
      )
    : undefined;
  const incomingProfile =
    voiceCall.incomingPeerUserId && !voiceCall.incomingGroupConversationId
      ? peerProfiles[voiceCall.incomingPeerUserId]
      : undefined;
  const activeProfile = voiceCall.activePeerUserId ? peerProfiles[voiceCall.activePeerUserId] : undefined;

  const incomingName = voiceCall.incomingGroupConversationId
    ? incomingGroupCaller?.name || voiceCall.incomingFromUsername || 'Người gọi'
    : incomingProfile?.fullName || voiceCall.incomingFromUsername || 'Người dùng';
  const incomingAvatar =
    incomingGroupCaller?.avatar ||
    incomingProfile?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(incomingName)}&background=random`;
  const activeName = voiceCall.activeGroupConversationId
    ? activeGroupCaller?.name || 'Cuộc gọi nhóm'
    : activeProfile?.fullName || voiceCall.activePeerDisplayName || voiceCall.incomingFromUsername || 'Người dùng';
  const activeAvatar =
    (voiceCall.activeGroupConversationId ? undefined : activeProfile?.avatarUrl) ||
    voiceCall.activePeerAvatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(activeName)}&background=random`;
  const isVideoCall = isCallOngoing && voiceCall.callMediaType === 'video';
  const showGlobalMinimizedBar = !showCallModal && (voiceCall.isRinging || isCallOngoing);
  const minimizedMode = voiceCall.isRinging ? 'incoming' : effectiveCallStatus === 'in_call' ? 'in_call' : 'outgoing';
  const incomingCallText =
    voiceCall.incomingMediaType === 'video' ? 'Đang có cuộc gọi video đến...' : 'Đang có cuộc gọi đến...';

  const contextValue = useMemo<RealtimeCallContextValue>(
    () => ({
      connected,
      sendMessage,
      sendGroupMessage,
      voiceCall,
      subscribeMessages,
      subscribeMessageStatuses,
      subscribePresenceStatuses,
      subscribePinnedMessages,
      subscribeNotificationEvents,
      subscribeChatErrors,
      sendMessageDelivered,
      sendConversationSeen,
    }),
    [
      connected,
      sendConversationSeen,
      sendGroupMessage,
      sendMessage,
      sendMessageDelivered,
      subscribeMessageStatuses,
      subscribeMessages,
      subscribePinnedMessages,
      subscribeNotificationEvents,
      subscribeChatErrors,
      subscribePresenceStatuses,
      voiceCall,
    ],
  );

  return (
    <RealtimeCallContext.Provider value={contextValue}>
      {children}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
      <video ref={localVideoRef} autoPlay muted playsInline className="hidden" />

      <CallMinimizedBar
        show={showGlobalMinimizedBar}
        user={{ name: voiceCall.isRinging ? incomingName : activeName, avatar: voiceCall.isRinging ? incomingAvatar : activeAvatar }}
        mode={minimizedMode}
        statusText={callStatusText}
        incomingText={incomingCallText}
        isVideoCall={isVideoCall}
        speakerMode={speakerMode}
        isCameraEnabled={voiceCall.isCameraEnabled}
        isMuted={voiceCall.isMuted}
        containerClassName="fixed top-16 left-1/2 -translate-x-1/2 z-[210] w-[min(560px,calc(100%-20px))]"
        onOpen={() => setShowCallModal(true)}
        onRejectIncoming={() => voiceCall.rejectIncoming()}
        onAcceptIncoming={() => {
          setShowCallModal(true);
          setSpeakerMode(voiceCall.incomingMediaType === 'video' ? 'outer' : 'inner');
          void voiceCall.acceptIncoming();
        }}
        onToggleSpeaker={() => setSpeakerMode((prev) => (prev === 'outer' ? 'inner' : 'outer'))}
        onToggleCamera={() => voiceCall.toggleCamera()}
        onToggleMute={() => voiceCall.toggleMute()}
        onEndCall={() => voiceCall.endCall()}
      />

      {voiceCall.isRinging && (
        <CallOverlayModal
          mode="incoming"
          show={showCallModal}
          user={{ name: incomingName, avatar: incomingAvatar }}
          incomingMediaType={voiceCall.incomingMediaType}
          groupCallParticipants={voiceCall.groupCallParticipants}
          currentUserId={currentUser?.id}
          callerUserId={voiceCall.incomingPeerUserId}
          zIndexClassName="z-[200]"
          onMinimize={() => setShowCallModal(false)}
          onRejectIncoming={() => voiceCall.rejectIncoming()}
          onAcceptIncoming={() => {
            setSpeakerMode(voiceCall.incomingMediaType === 'video' ? 'outer' : 'inner');
            void voiceCall.acceptIncoming();
          }}
        />
      )}

      {isCallOngoing && !voiceCall.isRinging && (
        <CallOverlayModal
          mode="ongoing"
          show={showCallModal}
          user={{ name: activeName, avatar: activeAvatar }}
          callStatus={effectiveCallStatus}
          callStatusText={callStatusText}
          isVideoCall={isVideoCall}
          hasRemoteStream={Boolean(voiceCall.remoteStream)}
          speakerMode={speakerMode}
          isCameraEnabled={voiceCall.isCameraEnabled}
          isMuted={voiceCall.isMuted}
          remoteVideoRef={remoteVideoRef}
          localVideoRef={localVideoRef}
          localStream={voiceCall.localStream}
          groupCallParticipants={voiceCall.groupCallParticipants}
          remoteStreams={voiceCall.remoteStreams}
          currentUserId={currentUser?.id}
          callerUserId={voiceCall.activeCallDirection === 'outgoing' ? currentUser?.id : voiceCall.activePeerUserId}
          zIndexClassName="z-[200]"
          onMinimize={() => setShowCallModal(false)}
          onToggleSpeaker={() => setSpeakerMode((prev) => (prev === 'outer' ? 'inner' : 'outer'))}
          onToggleCamera={() => voiceCall.toggleCamera()}
          onToggleMute={() => voiceCall.toggleMute()}
          onEndCall={() => voiceCall.endCall()}
        />
      )}
    </RealtimeCallContext.Provider>
  );
}

export function useRealtimeCall() {
  const context = useContext(RealtimeCallContext);
  if (!context) {
    throw new Error('useRealtimeCall must be used within RealtimeCallProvider');
  }
  return context;
}

