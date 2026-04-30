import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildRtcConfig, isWebRtcDebugEnabled } from '@/utils/webrtcConfig';
import type { CallSignalType, IncomingCallSignal, OutgoingCallSignal } from '../types/message.types';
import type { CallSessionSnapshotResponse } from '@/services/chatService';

type CallDirection = 'incoming' | 'outgoing';
type CallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'in_call' | 'ended' | 'error';
type CallMediaType = 'audio' | 'video';

interface ActiveCall {
  callId: string;
  peerUserId: string;
  peerDisplayName?: string;
  peerAvatarUrl?: string;
  groupConversationId?: string;
  participantIds?: string[];
  direction: CallDirection;
  mediaType: CallMediaType;
}

interface UseVoiceCallOptions {
  currentUserId?: string | null;
  sendCallSignal: (signal: OutgoingCallSignal) => void;
}

const CALL_RING_TIMEOUT_MS = 30000;
const CALL_CONNECT_TIMEOUT_MS = 20000;
const rtcConfig = buildRtcConfig();
const DEBUG_WEBRTC = isWebRtcDebugEnabled();

function createCallId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}

function hasVideoInSdp(sdp?: string | null) {
  return typeof sdp === 'string' && /\bm=video\b/i.test(sdp);
}

function extractCandidateType(candidate?: string | null) {
  if (!candidate) return 'unknown';
  if (candidate.includes(' typ relay ')) return 'relay';
  if (candidate.includes(' typ srflx ')) return 'srflx';
  if (candidate.includes(' typ prflx ')) return 'prflx';
  if (candidate.includes(' typ host ')) return 'host';
  return 'unknown';
}

export function useVoiceCall({ currentUserId, sendCallSignal }: UseVoiceCallOptions) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [incomingSignal, setIncomingSignal] = useState<IncomingCallSignal | null>(null);
  const [incomingMediaType, setIncomingMediaType] = useState<CallMediaType>('audio');
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStartedAtMs, setCallStartedAtMs] = useState<number | null>(null);
  const [authoritativeSessionStatus, setAuthoritativeSessionStatus] = useState<
    'RINGING' | 'ONGOING' | 'MISSED' | 'COMPLETED' | null
  >(null);
  const [authoritativeDurationSec, setAuthoritativeDurationSec] = useState<number | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const callTimeoutRef = useRef<number | null>(null);
  const connectTimeoutRef = useRef<number | null>(null);
  const hasRetriedIceRestartRef = useRef(false);

  const clearCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      window.clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

  const clearConnectTimeout = useCallback(() => {
    if (connectTimeoutRef.current) {
      window.clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  }, []);

  const logWebRtc = useCallback((message: string, details?: unknown) => {
    if (!DEBUG_WEBRTC) return;
    if (details !== undefined) {
      console.log(`[WebRTC] ${message}`, details);
      return;
    }
    console.log(`[WebRTC] ${message}`);
  }, []);

  const toEpochMs = useCallback((isoDate?: string | null) => {
    if (!isoDate) return null;
    const time = new Date(isoDate).getTime();
    return Number.isFinite(time) ? time : null;
  }, []);

  const applyAuthoritativeSnapshot = useCallback(
    (snapshot?: { status?: string | null; answeredAt?: string | null; durationSec?: number | null } | null) => {
      if (!snapshot) return;
      const normalizedStatus =
        snapshot.status === 'RINGING' ||
        snapshot.status === 'ONGOING' ||
        snapshot.status === 'MISSED' ||
        snapshot.status === 'COMPLETED'
          ? snapshot.status
          : null;
      setAuthoritativeSessionStatus(normalizedStatus);
      if (typeof snapshot.durationSec === 'number' && Number.isFinite(snapshot.durationSec)) {
        setAuthoritativeDurationSec(Math.max(0, Math.floor(snapshot.durationSec)));
      }
      const answeredAtMs = toEpochMs(snapshot.answeredAt);
      if (answeredAtMs) {
        setCallStartedAtMs(answeredAtMs);
      }
    },
    [toEpochMs],
  );

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
      clearConnectTimeout();
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      peerRef.current?.close();
      peerRef.current = null;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      pendingOfferRef.current = null;
      pendingIceRef.current = [];
      hasRetriedIceRestartRef.current = false;
      setLocalStream(null);
      setRemoteStream(null);
      setCallStartedAtMs(null);
      setAuthoritativeSessionStatus(null);
      setAuthoritativeDurationSec(null);
      setIncomingSignal(null);
      setIncomingMediaType('audio');
      setActiveCall(null);
      setIsMuted(false);
      setIsCameraEnabled(true);
      if (!keepStatus) {
        setStatus('idle');
      }
    },
    [clearCallTimeout, clearConnectTimeout],
  );

  const armConnectTimeout = useCallback(
    (peerUserId: string, callId: string) => {
      clearConnectTimeout();
      connectTimeoutRef.current = window.setTimeout(() => {
        sendSignal(peerUserId, callId, 'CALL_END');
        setErrorMessage('Kết nối cuộc gọi quá lâu. Vui lòng thử lại.');
        setStatus('ended');
        cleanup(true);
      }, CALL_CONNECT_TIMEOUT_MS);
    },
    [clearConnectTimeout, cleanup, sendSignal],
  );

  useEffect(() => {
    if (status === 'in_call' || status === 'ended' || status === 'error' || status === 'idle') {
      clearCallTimeout();
      clearConnectTimeout();
    }
  }, [clearCallTimeout, clearConnectTimeout, status]);

  useEffect(
    () => () => {
      clearCallTimeout();
      clearConnectTimeout();
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      peerRef.current?.close();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    },
    [clearCallTimeout, clearConnectTimeout],
  );

  const ensureLocalStream = useCallback(async (mediaType: CallMediaType) => {
    const existing = localStreamRef.current;

    if (existing) {
      const hasVideoTrack = existing.getVideoTracks().length > 0;
      if (mediaType === 'audio' || hasVideoTrack) {
        setLocalStream(existing);
        return existing;
      }

      existing.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mediaType === 'video',
    });
    if (mediaType === 'video') {
      const initialVideoEnabled = stream.getVideoTracks().some((track) => track.enabled);
      setIsCameraEnabled(initialVideoEnabled);
    } else {
      setIsCameraEnabled(true);
    }
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const createPeerConnection = useCallback(
    (callId: string, peerUserId: string) => {
      const existing = peerConnectionsRef.current.get(peerUserId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(rtcConfig);
      logWebRtc('createPeerConnection', {
        callId,
        peerUserId,
        iceTransportPolicy: rtcConfig.iceTransportPolicy ?? 'all',
        iceServers: rtcConfig.iceServers,
      });

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        logWebRtc('local ICE candidate', {
          callId,
          type: extractCandidateType(event.candidate.candidate),
          candidate: event.candidate.candidate,
        });
        sendSignal(peerUserId, callId, 'CALL_ICE', {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid ?? undefined,
          sdpMLineIndex: event.candidate.sdpMLineIndex ?? undefined,
        });
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        logWebRtc('remote track received', { callId, trackCount: stream?.getTracks().length ?? 0 });
        if (stream) {
          setRemoteStream(stream);
          setStatus((prev) => (prev === 'connecting' || prev === 'calling' ? 'in_call' : prev));
        }
      };

      pc.oniceconnectionstatechange = () => {
        logWebRtc('iceConnectionState', { callId, state: pc.iceConnectionState });
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          clearConnectTimeout();
          hasRetriedIceRestartRef.current = false;
          setStatus('in_call');
        } else if (
          pc.iceConnectionState === 'failed' ||
          pc.iceConnectionState === 'closed'
        ) {
          if (pc.iceConnectionState === 'failed' && !hasRetriedIceRestartRef.current) {
            hasRetriedIceRestartRef.current = true;
            armConnectTimeout(peerUserId, callId);
            void (async () => {
              try {
                const offer = await pc.createOffer({
                  iceRestart: true,
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: true,
                });
                await pc.setLocalDescription(offer);
                sendSignal(peerUserId, callId, 'CALL_OFFER', { sdp: offer.sdp ?? undefined });
                setStatus('connecting');
              } catch {
                setStatus('ended');
              }
            })();
          } else {
            setStatus('ended');
          }
        } else if (pc.iceConnectionState === 'disconnected' && !hasRetriedIceRestartRef.current) {
          hasRetriedIceRestartRef.current = true;
          armConnectTimeout(peerUserId, callId);
          setStatus((prev) => (prev === 'in_call' ? 'connecting' : prev));
          void (async () => {
            try {
              const offer = await pc.createOffer({
                iceRestart: true,
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
              });
              await pc.setLocalDescription(offer);
              sendSignal(peerUserId, callId, 'CALL_OFFER', { sdp: offer.sdp ?? undefined });
            } catch {
              // keep waiting for recovery / timeout
            }
          })();
        }
      };

      pc.onicegatheringstatechange = () => {
        logWebRtc('iceGatheringState', { callId, state: pc.iceGatheringState });
      };

      pc.onconnectionstatechange = () => {
        logWebRtc('connectionState', { callId, state: pc.connectionState });
        if (pc.connectionState === 'connected') {
          clearConnectTimeout();
          hasRetriedIceRestartRef.current = false;
          setStatus('in_call');
        } else if (
          pc.connectionState === 'failed' ||
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'closed'
        ) {
          setStatus('ended');
        }
      };

      peerConnectionsRef.current.set(peerUserId, pc);
      if (!peerRef.current) {
        peerRef.current = pc;
      }
      return pc;
    },
    [armConnectTimeout, clearConnectTimeout, logWebRtc, sendSignal],
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
    async (
      peerUserId: string,
      mediaType: CallMediaType = 'audio',
      peerDisplayName?: string,
      peerAvatarUrl?: string,
    ) => {
      if (!currentUserId) return;
      if (status !== 'idle' && status !== 'ended') return;

      setErrorMessage(null);

      const callId = createCallId();
      setActiveCall({ callId, peerUserId, peerDisplayName, peerAvatarUrl, direction: 'outgoing', mediaType });
      hasRetriedIceRestartRef.current = false;
      setCallStartedAtMs(null);
      setAuthoritativeSessionStatus('RINGING');
      setAuthoritativeDurationSec(null);
      setStatus('calling');
      sendSignal(peerUserId, callId, 'CALL_INVITE', { mediaType });
      logWebRtc('send CALL_INVITE', { callId, peerUserId, mediaType });

      clearCallTimeout();
      callTimeoutRef.current = window.setTimeout(() => {
        sendSignal(peerUserId, callId, 'CALL_CANCEL');
        setErrorMessage('Cuộc gọi không phản hồi.');
        setStatus('ended');
        cleanup(true);
      }, CALL_RING_TIMEOUT_MS);

      try {
        const local = await ensureLocalStream(mediaType);
        const pc = createPeerConnection(callId, peerUserId);
        local.getTracks().forEach((track) => pc.addTrack(track, local));

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: mediaType === 'video',
        });
        await pc.setLocalDescription(offer);
        logWebRtc('setLocalDescription offer', { callId });
        sendSignal(peerUserId, callId, 'CALL_OFFER', { sdp: offer.sdp ?? undefined });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Không thể bắt đầu cuộc gọi');
        setStatus('error');
        cleanup(true);
      }
    },
    [cleanup, clearCallTimeout, createPeerConnection, currentUserId, ensureLocalStream, logWebRtc, sendSignal, status],
  );

  const startGroupCall = useCallback(
    async (
      conversationId: string,
      participantIds: string[],
      mediaType: CallMediaType = 'audio',
      groupDisplayName?: string,
      groupAvatarUrl?: string,
      existingCallId?: string,
    ) => {
      if (!currentUserId) return;
      if (status !== 'idle' && status !== 'ended') return;

      const receivers = participantIds.filter((id) => id && id !== currentUserId);
      if (receivers.length === 0) return;

      setErrorMessage(null);

      const callId = existingCallId || createCallId();
      setActiveCall({
        callId,
        peerUserId: receivers[0],
        peerDisplayName: groupDisplayName,
        peerAvatarUrl: groupAvatarUrl,
        groupConversationId: conversationId,
        participantIds: receivers,
        direction: 'outgoing',
        mediaType,
      });
      hasRetriedIceRestartRef.current = false;
      setCallStartedAtMs(null);
      setAuthoritativeSessionStatus('RINGING');
      setAuthoritativeDurationSec(null);
      setStatus('calling');

      clearCallTimeout();
      callTimeoutRef.current = window.setTimeout(() => {
        receivers.forEach((receiverId) => {
          sendSignal(receiverId, callId, 'CALL_CANCEL', { conversationId });
        });
        setErrorMessage('Cuộc gọi không phản hồi.');
        setStatus('ended');
        cleanup(true);
      }, CALL_RING_TIMEOUT_MS);

      try {
        const local = await ensureLocalStream(mediaType);

        await Promise.all(
          receivers.map(async (receiverId) => {
            sendSignal(receiverId, callId, 'CALL_INVITE', {
              mediaType,
              conversationId,
              conversationName: groupDisplayName,
              conversationAvatarUrl: groupAvatarUrl,
            });
            const pc = createPeerConnection(callId, receiverId);
            local.getTracks().forEach((track) => pc.addTrack(track, local));
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: mediaType === 'video',
            });
            await pc.setLocalDescription(offer);
            sendSignal(receiverId, callId, 'CALL_OFFER', {
              sdp: offer.sdp ?? undefined,
              conversationId,
              conversationName: groupDisplayName,
              conversationAvatarUrl: groupAvatarUrl,
            });
          }),
        );
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Không thể bắt đầu cuộc gọi nhóm');
        setStatus('error');
        cleanup(true);
      }
    },
    [
      cleanup,
      clearCallTimeout,
      createPeerConnection,
      currentUserId,
      ensureLocalStream,
      sendSignal,
      status,
    ],
  );

  const rejectIncoming = useCallback(() => {
    if (!incomingSignal) return;
    sendSignal(incomingSignal.fromUserId, incomingSignal.callId, 'CALL_REJECT', {
      conversationId: incomingSignal.conversationId ?? undefined,
    });
    cleanup();
  }, [cleanup, incomingSignal, sendSignal]);

  const acceptIncoming = useCallback(async () => {
    if (!incomingSignal) return;
    const callId = incomingSignal.callId;
    const peerUserId = incomingSignal.fromUserId;
    const offerMediaType: CallMediaType = hasVideoInSdp(pendingOfferRef.current?.sdp) ? 'video' : incomingMediaType;

    setErrorMessage(null);
    setActiveCall({
      callId,
      peerUserId,
      groupConversationId: incomingSignal.conversationId ?? undefined,
      peerDisplayName: incomingSignal.conversationName ?? undefined,
      peerAvatarUrl: incomingSignal.conversationAvatarUrl ?? undefined,
      direction: 'incoming',
      mediaType: offerMediaType,
    });
    hasRetriedIceRestartRef.current = false;
    setCallStartedAtMs(Date.now());
    setAuthoritativeSessionStatus('ONGOING');
    setAuthoritativeDurationSec(0);
    setStatus('connecting');
    setIncomingSignal(null);
    setIncomingMediaType('audio');
    sendSignal(peerUserId, callId, 'CALL_ACCEPT', { conversationId: incomingSignal.conversationId ?? undefined });
    armConnectTimeout(peerUserId, callId);
    logWebRtc('send CALL_ACCEPT', { callId, peerUserId });

    try {
      const local = await ensureLocalStream(offerMediaType);
      const pc = createPeerConnection(callId, peerUserId);
      local.getTracks().forEach((track) => pc.addTrack(track, local));

      const pendingOffer = pendingOfferRef.current;
      if (pendingOffer) {
        pendingOfferRef.current = null;
        await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
        logWebRtc('setRemoteDescription offer', { callId });
      }

      if (pc.remoteDescription?.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        logWebRtc('setLocalDescription answer', { callId });
        sendSignal(peerUserId, callId, 'CALL_ANSWER', {
          sdp: answer.sdp ?? undefined,
          conversationId: incomingSignal.conversationId ?? undefined,
        });
      }

      await applyPendingIce();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể nhận cuộc gọi');
      setStatus('error');
      cleanup(true);
    }
  }, [
    applyPendingIce,
    armConnectTimeout,
    cleanup,
    createPeerConnection,
    ensureLocalStream,
    incomingMediaType,
    incomingSignal,
    logWebRtc,
    sendSignal,
  ]);

  const endCall = useCallback(() => {
    if (activeCall) {
      const endType: CallSignalType = status === 'in_call' ? 'CALL_END' : 'CALL_CANCEL';
      const receivers = activeCall.participantIds?.length ? activeCall.participantIds : [activeCall.peerUserId];
      receivers.forEach((receiverId) => {
        sendSignal(receiverId, activeCall.callId, endType, {
          conversationId: activeCall.groupConversationId,
        });
      });
    } else if (incomingSignal) {
      sendSignal(incomingSignal.fromUserId, incomingSignal.callId, 'CALL_CANCEL', {
        conversationId: incomingSignal.conversationId ?? undefined,
      });
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

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) return;

    const next = !isCameraEnabled;
    videoTracks.forEach((track) => {
      track.enabled = next;
    });
    setIsCameraEnabled(next);
  }, [isCameraEnabled]);

  const handleIncomingSignal = useCallback(
    async (signal: IncomingCallSignal) => {
      if (!currentUserId) return;
      if (signal.fromUserId === currentUserId) return;

      const matchesByCallId = activeCall?.callId === signal.callId;
      logWebRtc('incoming signal', { callId: signal.callId, type: signal.type });

      switch (signal.type) {
        case 'CALL_INVITE':
          if (status === 'idle' || status === 'ended') {
            setIncomingSignal(signal);
            setIncomingMediaType(signal.mediaType === 'video' ? 'video' : 'audio');
            applyAuthoritativeSnapshot({
              status: signal.sessionStatus,
              answeredAt: signal.sessionAnsweredAt,
              durationSec: signal.sessionDurationSec,
            });
            setStatus('ringing');
          } else {
            sendSignal(signal.fromUserId, signal.callId, 'CALL_REJECT');
          }
          break;
        case 'CALL_CANCEL':
          if (incomingSignal?.callId === signal.callId || matchesByCallId) {
            if (matchesByCallId && status === 'in_call') {
              break;
            }
            applyAuthoritativeSnapshot({
              status: signal.sessionStatus,
              answeredAt: signal.sessionAnsweredAt,
              durationSec: signal.sessionDurationSec,
            });
            setStatus('ended');
            cleanup(true);
          }
          break;
        case 'CALL_REJECT':
          if (incomingSignal?.callId === signal.callId || matchesByCallId) {
            if (matchesByCallId && status === 'in_call') {
              break;
            }
            applyAuthoritativeSnapshot({
              status: signal.sessionStatus,
              answeredAt: signal.sessionAnsweredAt,
              durationSec: signal.sessionDurationSec,
            });
            setStatus('ended');
            cleanup(true);
          }
          break;
        case 'CALL_END':
          if (incomingSignal?.callId === signal.callId || matchesByCallId) {
            applyAuthoritativeSnapshot({
              status: signal.sessionStatus,
              answeredAt: signal.sessionAnsweredAt,
              durationSec: signal.sessionDurationSec,
            });
            setStatus('ended');
            cleanup(true);
          }
          break;
        case 'CALL_ACCEPT':
          if (matchesByCallId && activeCall?.direction === 'outgoing') {
            setActiveCall((prev) =>
              prev && prev.callId === signal.callId
                ? { ...prev, peerDisplayName: prev.peerDisplayName || signal.fromUsername }
                : prev,
            );
            clearCallTimeout();
            applyAuthoritativeSnapshot({
              status: signal.sessionStatus,
              answeredAt: signal.sessionAnsweredAt ?? signal.createdAt,
              durationSec: signal.sessionDurationSec,
            });
            setStatus('connecting');
            armConnectTimeout(signal.fromUserId, signal.callId);
          }
          break;
        case 'CALL_OFFER':
          if (!signal.sdp) break;
          pendingOfferRef.current = { type: 'offer', sdp: signal.sdp };

          if (hasVideoInSdp(signal.sdp)) {
            setIncomingMediaType('video');
            setActiveCall((prev) =>
              prev && prev.callId === signal.callId ? { ...prev, mediaType: 'video' } : prev,
            );
          }

          if (matchesByCallId && peerRef.current) {
            try {
              await peerRef.current.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
              pendingOfferRef.current = null;
              const answer = await peerRef.current.createAnswer();
              await peerRef.current.setLocalDescription(answer);
              sendSignal(signal.fromUserId, signal.callId, 'CALL_ANSWER', {
                sdp: answer.sdp ?? undefined,
                conversationId: signal.conversationId ?? undefined,
              });
              await applyPendingIce();
            } catch {
              // Wait for manual accept flow.
            }
          }
          break;
        case 'CALL_ANSWER':
          {
          const pc = peerConnectionsRef.current.get(signal.fromUserId) ?? peerRef.current;
          if (!matchesByCallId || !signal.sdp || !pc) break;
          setActiveCall((prev) =>
            prev && prev.callId === signal.callId
              ? { ...prev, peerDisplayName: prev.peerDisplayName || signal.fromUsername }
              : prev,
          );
          clearCallTimeout();
          applyAuthoritativeSnapshot({
            status: signal.sessionStatus,
            answeredAt: signal.sessionAnsweredAt ?? signal.createdAt,
            durationSec: signal.sessionDurationSec,
          });
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
          logWebRtc('setRemoteDescription answer', { callId: signal.callId });
          setStatus('connecting');
          armConnectTimeout(signal.fromUserId, signal.callId);
          await applyPendingIce();
          break;
          }
        case 'CALL_ICE':
          if (!matchesByCallId || !signal.candidate) break;
          const candidate: RTCIceCandidateInit = {
            candidate: signal.candidate,
            sdpMid: signal.sdpMid ?? undefined,
            sdpMLineIndex: signal.sdpMLineIndex ?? undefined,
          };
          const icePeer = peerConnectionsRef.current.get(signal.fromUserId) ?? peerRef.current;
          if (icePeer?.remoteDescription) {
            try {
              logWebRtc('apply remote ICE', {
                callId: signal.callId,
                type: extractCandidateType(signal.candidate),
              });
              await icePeer.addIceCandidate(candidate);
            } catch {
              // Ignore malformed candidate.
            }
          } else {
            logWebRtc('queue remote ICE (remoteDescription not ready)', {
              callId: signal.callId,
              type: extractCandidateType(signal.candidate),
            });
            pendingIceRef.current.push(candidate);
          }
          break;
        default:
          break;
      }
    },
    [
      activeCall,
      applyAuthoritativeSnapshot,
      applyPendingIce,
      cleanup,
      clearCallTimeout,
      currentUserId,
      incomingSignal,
      logWebRtc,
      armConnectTimeout,
      sendSignal,
      status,
      toEpochMs,
    ],
  );

  const syncAuthoritativeSession = useCallback((snapshot: CallSessionSnapshotResponse | null | undefined) => {
    if (!snapshot) return;
    applyAuthoritativeSnapshot({
      status: snapshot.status,
      answeredAt: snapshot.answeredAt ?? null,
      durationSec: snapshot.durationSec ?? null,
    });
  }, [applyAuthoritativeSnapshot]);

  const incomingPeerUserId = incomingSignal?.fromUserId ?? null;
  const incomingGroupConversationId = incomingSignal?.conversationId ?? null;

  return useMemo(
    () => ({
      status,
      errorMessage,
      isMuted,
      isCameraEnabled,
      localStream,
      remoteStream,
      callStartedAtMs,
      authoritativeSessionStatus,
      authoritativeDurationSec,
      callMediaType: activeCall?.mediaType ?? incomingMediaType,
      incomingMediaType,
      activeCallId: activeCall?.callId ?? null,
      activeGroupConversationId: activeCall?.groupConversationId ?? null,
      incomingPeerUserId,
      incomingGroupConversationId,
      incomingFromUsername: incomingSignal?.fromUsername ?? null,
      incomingGroupDisplayName: incomingSignal?.conversationName ?? null,
      incomingGroupAvatarUrl: incomingSignal?.conversationAvatarUrl ?? null,
      activePeerUserId: activeCall?.peerUserId ?? null,
      activePeerDisplayName: activeCall?.peerDisplayName ?? null,
      activePeerAvatarUrl: activeCall?.peerAvatarUrl ?? null,
      hasActiveCall: status === 'calling' || status === 'connecting' || status === 'in_call',
      isRinging: status === 'ringing',
      startCall,
      startGroupCall,
      acceptIncoming,
      rejectIncoming,
      endCall,
      toggleMute,
      toggleCamera,
      handleIncomingSignal,
      syncAuthoritativeSession,
    }),
    [
      acceptIncoming,
      activeCall?.callId,
      activeCall?.groupConversationId,
      activeCall?.mediaType,
      activeCall?.peerAvatarUrl,
      activeCall?.peerDisplayName,
      activeCall?.peerUserId,
      endCall,
      errorMessage,
      handleIncomingSignal,
      incomingMediaType,
      incomingGroupConversationId,
      incomingPeerUserId,
      incomingSignal?.conversationAvatarUrl,
      incomingSignal?.conversationName,
      incomingSignal?.fromUsername,
      isCameraEnabled,
      isMuted,
      localStream,
      rejectIncoming,
      remoteStream,
      callStartedAtMs,
      authoritativeSessionStatus,
      authoritativeDurationSec,
      syncAuthoritativeSession,
      startCall,
      startGroupCall,
      status,
      toggleCamera,
      toggleMute,
    ],
  );
}


