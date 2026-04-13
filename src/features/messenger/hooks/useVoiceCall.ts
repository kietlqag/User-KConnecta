import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CallSignalType, IncomingCallSignal, OutgoingCallSignal } from '../types/message.types';

type CallDirection = 'incoming' | 'outgoing';
type CallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'in_call' | 'ended' | 'error';

interface ActiveCall {
  callId: string;
  peerUserId: string;
  direction: CallDirection;
}

interface UseVoiceCallOptions {
  currentUserId?: string | null;
  sendCallSignal: (signal: OutgoingCallSignal) => void;
}

const CALL_TIMEOUT_MS = 30000;
const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

function createCallId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}

export function useVoiceCall({ currentUserId, sendCallSignal }: UseVoiceCallOptions) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [incomingSignal, setIncomingSignal] = useState<IncomingCallSignal | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const callTimeoutRef = useRef<number | null>(null);

  const clearCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      window.clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

  const sendSignal = useCallback(
    (receiverId: string, callId: string, type: CallSignalType, extra?: Partial<OutgoingCallSignal>) => {
      sendCallSignal({
        receiverId,
        callId,
        type,
        ...extra,
      });
    },
    [sendCallSignal],
  );

  const cleanup = useCallback(
    (keepStatus = false) => {
      clearCallTimeout();
      peerRef.current?.close();
      peerRef.current = null;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      pendingOfferRef.current = null;
      pendingIceRef.current = [];
      setLocalStream(null);
      setRemoteStream(null);
      setIncomingSignal(null);
      setActiveCall(null);
      setIsMuted(false);
      if (!keepStatus) {
        setStatus('idle');
      }
    },
    [clearCallTimeout],
  );

  useEffect(() => {
    if (status === 'in_call' || status === 'ended' || status === 'error' || status === 'idle') {
      clearCallTimeout();
    }
  }, [clearCallTimeout, status]);

  useEffect(
    () => () => {
      clearCallTimeout();
      peerRef.current?.close();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    },
    [clearCallTimeout],
  );

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const createPeerConnection = useCallback(
    (callId: string, peerUserId: string) => {
      if (peerRef.current) return peerRef.current;

      const pc = new RTCPeerConnection(rtcConfig);

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        sendSignal(peerUserId, callId, 'CALL_ICE', {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid ?? undefined,
          sdpMLineIndex: event.candidate.sdpMLineIndex ?? undefined,
        });
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) setRemoteStream(stream);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setStatus('in_call');
        } else if (
          pc.connectionState === 'failed' ||
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'closed'
        ) {
          setStatus('ended');
        }
      };

      peerRef.current = pc;
      return pc;
    },
    [sendSignal],
  );

  const applyPendingIce = useCallback(async () => {
    if (!peerRef.current || !peerRef.current.remoteDescription) return;
    if (pendingIceRef.current.length === 0) return;

    const candidates = [...pendingIceRef.current];
    pendingIceRef.current = [];

    for (const candidate of candidates) {
      try {
        await peerRef.current.addIceCandidate(candidate);
      } catch {
        // Ignore malformed candidate.
      }
    }
  }, []);

  const startCall = useCallback(
    async (peerUserId: string) => {
      if (!currentUserId) return;
      if (status !== 'idle' && status !== 'ended') return;

      setErrorMessage(null);

      const callId = createCallId();
      setActiveCall({ callId, peerUserId, direction: 'outgoing' });
      setStatus('calling');
      sendSignal(peerUserId, callId, 'CALL_INVITE');

      clearCallTimeout();
      callTimeoutRef.current = window.setTimeout(() => {
        sendSignal(peerUserId, callId, 'CALL_CANCEL');
        setErrorMessage('Cuộc gọi không phản hồi.');
        setStatus('ended');
        cleanup(true);
      }, CALL_TIMEOUT_MS);

      try {
        const local = await ensureLocalStream();
        const pc = createPeerConnection(callId, peerUserId);
        local.getTracks().forEach((track) => pc.addTrack(track, local));

        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        sendSignal(peerUserId, callId, 'CALL_OFFER', { sdp: offer.sdp ?? undefined });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Không thể bắt đầu cuộc gọi');
        setStatus('error');
        cleanup(true);
      }
    },
    [cleanup, clearCallTimeout, createPeerConnection, currentUserId, ensureLocalStream, sendSignal, status],
  );

  const rejectIncoming = useCallback(() => {
    if (!incomingSignal) return;
    sendSignal(incomingSignal.fromUserId, incomingSignal.callId, 'CALL_REJECT');
    cleanup();
  }, [cleanup, incomingSignal, sendSignal]);

  const acceptIncoming = useCallback(async () => {
    if (!incomingSignal) return;
    const callId = incomingSignal.callId;
    const peerUserId = incomingSignal.fromUserId;

    setErrorMessage(null);
    setActiveCall({ callId, peerUserId, direction: 'incoming' });
    setStatus('connecting');
    setIncomingSignal(null);
    sendSignal(peerUserId, callId, 'CALL_ACCEPT');

    try {
      const local = await ensureLocalStream();
      const pc = createPeerConnection(callId, peerUserId);
      local.getTracks().forEach((track) => pc.addTrack(track, local));

      const pendingOffer = pendingOfferRef.current;
      if (pendingOffer) {
        pendingOfferRef.current = null;
        await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
      }

      if (pc.remoteDescription?.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(peerUserId, callId, 'CALL_ANSWER', { sdp: answer.sdp ?? undefined });
      }

      await applyPendingIce();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể nhận cuộc gọi');
      setStatus('error');
      cleanup(true);
    }
  }, [applyPendingIce, cleanup, createPeerConnection, ensureLocalStream, incomingSignal, sendSignal]);

  const endCall = useCallback(() => {
    if (activeCall) {
      const endType: CallSignalType = status === 'in_call' ? 'CALL_END' : 'CALL_CANCEL';
      sendSignal(activeCall.peerUserId, activeCall.callId, endType);
    } else if (incomingSignal) {
      sendSignal(incomingSignal.fromUserId, incomingSignal.callId, 'CALL_CANCEL');
    }
    setStatus('ended');
    cleanup(true);
  }, [activeCall, cleanup, incomingSignal, sendSignal, status]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsMuted(next);
  }, [isMuted]);

  const handleIncomingSignal = useCallback(
    async (signal: IncomingCallSignal) => {
      if (!currentUserId) return;
      if (signal.fromUserId === currentUserId) return;

      const matchesByCallId = activeCall?.callId === signal.callId;

      switch (signal.type) {
        case 'CALL_INVITE':
          if (status === 'idle' || status === 'ended') {
            setIncomingSignal(signal);
            setStatus('ringing');
          } else {
            sendSignal(signal.fromUserId, signal.callId, 'CALL_REJECT');
          }
          break;
        case 'CALL_CANCEL':
        case 'CALL_REJECT':
        case 'CALL_END':
          if (incomingSignal?.callId === signal.callId || matchesByCallId) {
            setStatus('ended');
            cleanup(true);
          }
          break;
        case 'CALL_ACCEPT':
          if (matchesByCallId && activeCall?.direction === 'outgoing') {
            setStatus('connecting');
          }
          break;
        case 'CALL_OFFER':
          if (!signal.sdp) break;
          pendingOfferRef.current = { type: 'offer', sdp: signal.sdp };
          if (matchesByCallId && peerRef.current) {
            try {
              await peerRef.current.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
              pendingOfferRef.current = null;
              const answer = await peerRef.current.createAnswer();
              await peerRef.current.setLocalDescription(answer);
              sendSignal(signal.fromUserId, signal.callId, 'CALL_ANSWER', { sdp: answer.sdp ?? undefined });
              await applyPendingIce();
            } catch {
              // Wait for manual accept flow.
            }
          }
          break;
        case 'CALL_ANSWER':
          if (!matchesByCallId || !signal.sdp || !peerRef.current) break;
          await peerRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
          setStatus('connecting');
          await applyPendingIce();
          break;
        case 'CALL_ICE':
          if (!matchesByCallId || !signal.candidate) break;
          const candidate: RTCIceCandidateInit = {
            candidate: signal.candidate,
            sdpMid: signal.sdpMid ?? undefined,
            sdpMLineIndex: signal.sdpMLineIndex ?? undefined,
          };
          if (peerRef.current?.remoteDescription) {
            try {
              await peerRef.current.addIceCandidate(candidate);
            } catch {
              // Ignore malformed candidate.
            }
          } else {
            pendingIceRef.current.push(candidate);
          }
          break;
        default:
          break;
      }
    },
    [activeCall, applyPendingIce, cleanup, currentUserId, incomingSignal, sendSignal, status],
  );

  const incomingPeerUserId = incomingSignal?.fromUserId ?? null;

  return useMemo(
    () => ({
      status,
      errorMessage,
      isMuted,
      localStream,
      remoteStream,
      activeCallId: activeCall?.callId ?? null,
      incomingPeerUserId,
      incomingFromUsername: incomingSignal?.fromUsername ?? null,
      activePeerUserId: activeCall?.peerUserId ?? null,
      hasActiveCall: status === 'calling' || status === 'connecting' || status === 'in_call',
      isRinging: status === 'ringing',
      startCall,
      acceptIncoming,
      rejectIncoming,
      endCall,
      toggleMute,
      handleIncomingSignal,
    }),
    [
      acceptIncoming,
      activeCall?.peerUserId,
      endCall,
      errorMessage,
      handleIncomingSignal,
      incomingPeerUserId,
      incomingSignal?.fromUsername,
      isMuted,
      localStream,
      rejectIncoming,
      remoteStream,
      startCall,
      status,
      toggleMute,
    ],
  );
}
