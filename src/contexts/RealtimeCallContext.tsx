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
import { authService } from '@/services/authService';
import { chatService } from '@/services/chatService';
import { CallMinimizedBar, CallOverlayModal } from '@/features/messenger/components';
import { useChatSocket } from '@/features/messenger/hooks/useChatSocket';
import { useVoiceCall } from '@/features/messenger/hooks/useVoiceCall';
import type {
  IncomingCallSignal,
  IncomingChatMessage,
  IncomingMessageStatus,
  IncomingPresenceStatus,
} from '@/features/messenger/types/message.types';

type MessageListener = (msg: IncomingChatMessage) => void;
type MessageStatusListener = (status: IncomingMessageStatus) => void;
type PresenceStatusListener = (status: IncomingPresenceStatus) => void;

interface RealtimeCallContextValue {
  connected: boolean;
  sendMessage: (receiverId: string, content: string) => void;
  voiceCall: ReturnType<typeof useVoiceCall>;
  subscribeMessages: (listener: MessageListener) => () => void;
  subscribeMessageStatuses: (listener: MessageStatusListener) => () => void;
  subscribePresenceStatuses: (listener: PresenceStatusListener) => () => void;
  sendMessageDelivered: (messageId: string) => void;
  sendConversationSeen: (peerUserId: string) => void;
}

interface PeerProfile {
  fullName: string;
  avatarUrl?: string;
}

const RealtimeCallContext = createContext<RealtimeCallContextValue | null>(null);

export function RealtimeCallProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [currentUser] = useState(() => authService.getCurrentUser());
  const listenersRef = useRef<Set<MessageListener>>(new Set());
  const statusListenersRef = useRef<Set<MessageStatusListener>>(new Set());
  const presenceListenersRef = useRef<Set<PresenceStatusListener>>(new Set());
  const latestPresenceByUserRef = useRef<Record<string, IncomingPresenceStatus>>({});
  const callSignalHandlerRef = useRef<(signal: IncomingCallSignal) => void>(() => {});
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
      let callerName = peerProfiles[signal.fromUserId]?.fullName || signal.fromUsername || 'Người dùng';
      if (!peerProfiles[signal.fromUserId] && !peerProfileLoadingRef.current.has(signal.fromUserId)) {
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
          body: `${callerName} đang gọi cho bạn`,
          tag: `call-${signal.callId}`,
          requireInteraction: true,
        },
      );

      notif.onclick = () => {
        window.focus();
        setShowCallModal(true);
        navigate(`/messages?with=${signal.fromUserId}`);
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

  const { connected, sendMessage, sendCallSignal, sendMessageDelivered, sendConversationSeen } = useChatSocket(
    currentUser?.token,
    handleIncomingMessage,
    handleIncomingCallSignal,
    handleIncomingMessageStatus,
    handleIncomingPresenceStatus,
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
    const peerIds = [voiceCall.incomingPeerUserId, voiceCall.activePeerUserId].filter(
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
  }, [peerProfiles, voiceCall.activePeerUserId, voiceCall.incomingPeerUserId]);

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
      const elapsed = Math.floor((Date.now() - voiceCall.callStartedAtMs) / 1000);
      setCallDurationSec(Math.max(0, elapsed));
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
        const snapshot = await chatService.getCallSessionSnapshot(voiceCall.activeCallId);
        if (cancelled) return;

        voiceCall.syncAuthoritativeSession(snapshot);

        if (snapshot.status === 'RINGING') {
          setAuthoritativeStatusText('Đang gọi...');
          return;
        }

        if (snapshot.status === 'ONGOING') {
          if (typeof snapshot.durationSec === 'number' && Number.isFinite(snapshot.durationSec)) {
            const safeDuration = Math.max(0, Math.floor(snapshot.durationSec));
            setCallDurationSec(safeDuration);
            setAuthoritativeStatusText(formatCallDuration(safeDuration));
          } else {
            setAuthoritativeStatusText(null);
          }
          return;
        }

        if (snapshot.status === 'MISSED') {
          setAuthoritativeStatusText('Cuộc gọi nhỡ');
          return;
        }

        if (snapshot.status === 'COMPLETED') {
          const safeDuration =
            typeof snapshot.durationSec === 'number' && Number.isFinite(snapshot.durationSec)
              ? Math.max(0, Math.floor(snapshot.durationSec))
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
  }, [formatCallDuration, isCallConnected, voiceCall.activeCallId, voiceCall.syncAuthoritativeSession]);

  const callStatusText =
    authoritativeStatusText ||
    (effectiveCallStatus === 'calling'
      ? 'Đang gọi...'
      : effectiveCallStatus === 'connecting'
        ? 'Đang kết nối...'
        : formatCallDuration(callDurationSec));

  const incomingProfile = voiceCall.incomingPeerUserId ? peerProfiles[voiceCall.incomingPeerUserId] : undefined;
  const activeProfile = voiceCall.activePeerUserId ? peerProfiles[voiceCall.activePeerUserId] : undefined;

  const incomingName = incomingProfile?.fullName || voiceCall.incomingFromUsername || 'Người dùng';
  const incomingAvatar =
    incomingProfile?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(incomingName)}&background=random`;
  const activeName =
    activeProfile?.fullName || voiceCall.activePeerDisplayName || voiceCall.incomingFromUsername || 'Người dùng';
  const activeAvatar =
    activeProfile?.avatarUrl ||
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
      voiceCall,
      subscribeMessages,
      subscribeMessageStatuses,
      subscribePresenceStatuses,
      sendMessageDelivered,
      sendConversationSeen,
    }),
    [
      connected,
      sendConversationSeen,
      sendMessage,
      sendMessageDelivered,
      subscribeMessageStatuses,
      subscribeMessages,
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

