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
import { useLocation, useNavigate } from 'react-router-dom';
import { Phone, PhoneOff, X } from 'lucide-react';
import { authService } from '@/services/authService';
import { useChatSocket } from '@/features/messenger/hooks/useChatSocket';
import { useVoiceCall } from '@/features/messenger/hooks/useVoiceCall';
import type { IncomingCallSignal, IncomingChatMessage } from '@/features/messenger/types/message.types';

type MessageListener = (msg: IncomingChatMessage) => void;

interface RealtimeCallContextValue {
  connected: boolean;
  sendMessage: (receiverId: string, content: string) => void;
  voiceCall: ReturnType<typeof useVoiceCall>;
  subscribeMessages: (listener: MessageListener) => () => void;
}

const RealtimeCallContext = createContext<RealtimeCallContextValue | null>(null);

export function RealtimeCallProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const listenersRef = useRef<Set<MessageListener>>(new Set());
  const callSignalHandlerRef = useRef<(signal: IncomingCallSignal) => void>(() => {});
  const desktopNotificationRef = useRef<Notification | null>(null);
  const notifiedCallIdRef = useRef<string | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [showCallModal, setShowCallModal] = useState(true);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callDurationSec, setCallDurationSec] = useState(0);

  const handleIncomingMessage = useCallback((msg: IncomingChatMessage) => {
    listenersRef.current.forEach((listener) => listener(msg));
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

      const notif = new Notification(
        signal.mediaType === 'video' ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến',
        {
          body: `${signal.fromUsername || 'Người dùng'} đang gọi cho bạn`,
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
    [closeDesktopNotification, currentUser?.id, navigate],
  );

  const handleIncomingCallSignal = useCallback((signal: IncomingCallSignal) => {
    void maybeShowDesktopNotification(signal);
    if (signal.type === 'CALL_CANCEL' || signal.type === 'CALL_REJECT' || signal.type === 'CALL_END') {
      closeDesktopNotification();
    }
    callSignalHandlerRef.current(signal);
  }, [closeDesktopNotification, maybeShowDesktopNotification]);

  const { connected, sendMessage, sendCallSignal } = useChatSocket(
    currentUser?.token,
    handleIncomingMessage,
    handleIncomingCallSignal,
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

  useEffect(() => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    audio.srcObject = voiceCall.remoteStream;
    return () => {
      audio.srcObject = null;
    };
  }, [voiceCall.remoteStream]);

  const isCallOngoing =
    voiceCall.status === 'calling' || voiceCall.status === 'connecting' || voiceCall.status === 'in_call';
  const isCallConnected = voiceCall.status === 'in_call';

  useEffect(() => {
    if (voiceCall.isRinging) {
      setShowCallModal(true);
    } else {
      closeDesktopNotification();
    }
  }, [closeDesktopNotification, voiceCall.isRinging]);

  useEffect(() => {
    return () => {
      closeDesktopNotification();
    };
  }, [closeDesktopNotification]);

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
    const tick = () => setCallDurationSec(Math.floor((Date.now() - callStartedAt) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [callStartedAt, isCallConnected]);

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

  const incomingName = voiceCall.incomingFromUsername || 'Người dùng';
  const incomingAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(incomingName)}&background=random`;
  const shouldRenderGlobalModal = location.pathname !== '/messages';

  const contextValue = useMemo<RealtimeCallContextValue>(
    () => ({
      connected,
      sendMessage,
      voiceCall,
      subscribeMessages,
    }),
    [connected, sendMessage, subscribeMessages, voiceCall],
  );

  return (
    <RealtimeCallContext.Provider value={contextValue}>
      {children}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {shouldRenderGlobalModal && voiceCall.isRinging && showCallModal && (
        <div className="fixed inset-0 z-[200] bg-black/20 flex items-center justify-center">
          <div className="w-[340px] rounded-2xl bg-white border border-gray-200 shadow-2xl p-5">
            <div className="flex justify-end">
              <button
                onClick={() => setShowCallModal(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                title="Thu gọn"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="text-center">
              <img src={incomingAvatar} alt={incomingName} className="w-20 h-20 rounded-full object-cover mx-auto" />
              <p className="mt-3 text-lg font-semibold text-gray-900">{incomingName}</p>
              <p className="mt-1 text-sm text-gray-500">
                {voiceCall.incomingMediaType === 'video' ? 'Đang gọi video cho bạn' : 'Đang gọi thoại cho bạn'}
              </p>
            </div>
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={() => voiceCall.rejectIncoming()}
                className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center"
                title="Từ chối"
              >
                <PhoneOff className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => {
                  void voiceCall.acceptIncoming();
                }}
                className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
                title="Nghe máy"
              >
                <Phone className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {shouldRenderGlobalModal && isCallOngoing && !voiceCall.isRinging && showCallModal && (
        <div className="fixed inset-0 z-[200] bg-black/20 flex items-center justify-center">
          <div className="w-[340px] rounded-2xl bg-white border border-gray-200 shadow-2xl p-5">
            <div className="flex justify-end">
              <button
                onClick={() => setShowCallModal(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                title="Thu gọn"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="text-center">
              <p className="mt-2 text-lg font-semibold text-gray-900">Cuộc gọi đang diễn ra</p>
              <p className="mt-1 text-sm text-gray-500">{callStatusText}</p>
            </div>
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={() => voiceCall.endCall()}
                className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center"
                title="Kết thúc"
              >
                <PhoneOff className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
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
