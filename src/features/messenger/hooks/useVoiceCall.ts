import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { buildRtcConfig, isWebRtcDebugEnabled } from '@/utils/webrtcConfig';
import { calculateCallDurationSeconds, normalizeCallDurationSeconds } from '../utils/callDuration';
import type {
  CallSignalType,
  GroupCallParticipant,
  GroupCallParticipantSignal,
  IncomingCallError,
  IncomingCallSignal,
  OutgoingCallSignal,
} from '../types/message.types';
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
  sendCallSignal: (signal: OutgoingCallSignal) => boolean;
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

function participantAvatar(name: string, avatar?: string) {
  return avatar?.trim() || '';
}

function uniqueParticipants(participants: GroupCallParticipantSignal[]) {
  const byId = new Map<string, GroupCallParticipantSignal>();
  participants.forEach((participant) => {
    if (participant.userId && !byId.has(participant.userId)) {
      byId.set(participant.userId, participant);
    }
  });
  return Array.from(byId.values());
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
  const [remoteStreams, setRemoteStreams] = useState<Array<{ userId: string; stream: MediaStream }>>([]);
  const [groupCallParticipants, setGroupCallParticipants] = useState<GroupCallParticipant[]>([]);
  const [activeGroupParticipantCount, setActiveGroupParticipantCount] = useState(0);
  const [callStartedAtMs, setCallStartedAtMs] = useState<number | null>(null);
  const [authoritativeSessionStatus, setAuthoritativeSessionStatus] = useState<
    'RINGING' | 'ONGOING' | 'MISSED' | 'COMPLETED' | null
  >(null);
  const [authoritativeDurationSec, setAuthoritativeDurationSec] = useState<number | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const activeCallRef = useRef<ActiveCall | null>(null);
  const connectedGroupParticipantIdsRef = useRef<Set<string>>(new Set());
  const settledGroupParticipantIdsRef = useRef<Set<string>>(new Set());
  const participantLeaveToastKeysRef = useRef<Set<string>>(new Set());
  const remoteStreamsByPeerRef = useRef<Map<string, MediaStream>>(new Map());
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

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

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
        setAuthoritativeDurationSec(normalizeCallDurationSeconds(snapshot.durationSec));
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
      return sendCallSignal({
        receiverId,
        callId,
        type,
        ...extra,
      });
    },
    [sendCallSignal],
  );

  const refreshGroupParticipantCount = useCallback(() => {
    setActiveGroupParticipantCount(connectedGroupParticipantIdsRef.current.size);
  }, []);

  const updateGroupParticipant = useCallback(
    (userId: string, patch: Partial<GroupCallParticipant> & { name?: string; avatar?: string }) => {
      if (!userId) return;
      setGroupCallParticipants((prev) => {
        const existing = prev.find((participant) => participant.userId === userId);
        const isLeavingJoinedCall =
          existing?.status === 'joined' &&
          userId !== currentUserId &&
          (patch.status === 'left' || patch.status === 'rejected' || patch.status === 'missed');
        const leaveToastKey = `${activeCallRef.current?.callId ?? 'call'}:${userId}:${patch.status ?? ''}`;
        if (isLeavingJoinedCall && !participantLeaveToastKeysRef.current.has(leaveToastKey)) {
          participantLeaveToastKeysRef.current.add(leaveToastKey);
          toast(`${existing.name || patch.name || 'Người dùng'} đã rời khỏi cuộc gọi`);
        }
        if (!existing) {
          const name = patch.name || 'Người dùng';
          return [
            ...prev,
            {
              userId,
              name,
              avatar: participantAvatar(name, patch.avatar),
              status: patch.status ?? 'invited',
              micEnabled: patch.micEnabled ?? true,
              cameraEnabled: patch.cameraEnabled ?? true,
              joinedAt: patch.joinedAt,
              leftAt: patch.leftAt,
            },
          ];
        }
        return prev.map((participant) =>
          participant.userId === userId
            ? {
                ...participant,
                ...patch,
                avatar:
                  patch.avatar !== undefined
                    ? participantAvatar(patch.name ?? participant.name, patch.avatar)
                    : participant.avatar,
                name: patch.name ?? participant.name,
              }
            : participant,
        );
      });
    },
    [currentUserId],
  );

  const buildGroupParticipants = useCallback(
    (
      participants: GroupCallParticipantSignal[] | undefined,
      callerId: string,
      callerName: string,
      callerAvatar: string | undefined,
      selfStatus: GroupCallParticipant['status'],
    ) => {
      const byId = new Map<string, GroupCallParticipantSignal>();
      (participants ?? []).forEach((participant) => {
        if (participant.userId) byId.set(participant.userId, participant);
      });
      byId.set(callerId, {
        userId: callerId,
        name: callerName || byId.get(callerId)?.name || 'Người gọi',
        avatar: callerAvatar ?? byId.get(callerId)?.avatar,
      });
      return Array.from(byId.values()).map<GroupCallParticipant>((participant) => {
        const isCaller = participant.userId === callerId;
        const isSelf = participant.userId === currentUserId;
        const status: GroupCallParticipant['status'] = isCaller ? 'joined' : isSelf ? selfStatus : 'ringing';
        return {
          userId: participant.userId,
          name: participant.name || 'Người dùng',
          avatar: participantAvatar(participant.name || 'Người dùng', participant.avatar),
          status,
          micEnabled: true,
          cameraEnabled: true,
          joinedAt: isCaller ? Date.now() : undefined,
        };
      });
    },
    [currentUserId],
  );

  const addGroupParticipant = useCallback(
    (userId?: string | null) => {
      if (!userId) return;
      connectedGroupParticipantIdsRef.current.add(userId);
      updateGroupParticipant(userId, { status: 'joined', joinedAt: Date.now(), leftAt: undefined });
      refreshGroupParticipantCount();
    },
    [refreshGroupParticipantCount, updateGroupParticipant],
  );

  const removeGroupParticipant = useCallback(
    (userId?: string | null) => {
      if (!userId) return;
      connectedGroupParticipantIdsRef.current.delete(userId);
      updateGroupParticipant(userId, { status: 'left', leftAt: Date.now() });
      refreshGroupParticipantCount();
    },
    [refreshGroupParticipantCount, updateGroupParticipant],
  );

  const closePeerConnection = useCallback((peerUserId: string) => {
    const pc = peerConnectionsRef.current.get(peerUserId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.oniceconnectionstatechange = null;
      pc.onconnectionstatechange = null;
      pc.close();
      peerConnectionsRef.current.delete(peerUserId);
    }
    remoteStreamsByPeerRef.current.delete(peerUserId);
    const nextRemoteStream = (remoteStreamsByPeerRef.current.values().next().value as MediaStream | undefined) ?? null;
    setRemoteStream(nextRemoteStream);
    setRemoteStreams(Array.from(remoteStreamsByPeerRef.current, ([userId, stream]) => ({ userId, stream })));
    if (peerRef.current === pc) {
      peerRef.current = (peerConnectionsRef.current.values().next().value as RTCPeerConnection | undefined) ?? null;
    }
  }, []);

  const cleanup = useCallback(
    (keepStatus = false) => {
      clearCallTimeout();
      clearConnectTimeout();
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      peerRef.current?.close();
      peerRef.current = null;
      connectedGroupParticipantIdsRef.current.clear();
      settledGroupParticipantIdsRef.current.clear();
      participantLeaveToastKeysRef.current.clear();
      remoteStreamsByPeerRef.current.clear();

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      pendingOfferRef.current = null;
      pendingIceRef.current = [];
      hasRetriedIceRestartRef.current = false;
      setLocalStream(null);
      setRemoteStream(null);
      setRemoteStreams([]);
      setGroupCallParticipants([]);
      setActiveGroupParticipantCount(0);
      setCallStartedAtMs(null);
      setAuthoritativeSessionStatus(null);
      setAuthoritativeDurationSec(null);
      setIncomingSignal(null);
      setIncomingMediaType('audio');
      activeCallRef.current = null;
      setActiveCall(null);
      setIsMuted(false);
      setIsCameraEnabled(true);
      if (!keepStatus) {
        setStatus('idle');
      }
    },
    [clearCallTimeout, clearConnectTimeout],
  );

  const finishGroupCallIfAllReceiversSettled = useCallback(
    (call: ActiveCall, lastReceiverId: string) => {
      if (!call.groupConversationId || call.direction !== 'outgoing') return false;
      if (connectedGroupParticipantIdsRef.current.size > 1) return false;
      const receiverCount = call.participantIds?.length ?? 0;
      if (receiverCount === 0 || settledGroupParticipantIdsRef.current.size < receiverCount) return false;

      sendSignal(lastReceiverId, call.callId, 'CALL_CANCEL', {
        conversationId: call.groupConversationId,
      });
      setStatus('ended');
      cleanup(true);
      return true;
    },
    [cleanup, sendSignal],
  );

  const broadcastGroupParticipantUpdate = useCallback(
    (
      call: ActiveCall,
      participantUserId: string,
      participantStatus: GroupCallParticipant['status'],
      exceptUserId?: string,
      mediaState?: { micEnabled?: boolean; cameraEnabled?: boolean },
    ) => {
      if (!call.groupConversationId || call.direction !== 'outgoing') return;
      const receivers = (call.participantIds ?? []).filter(
        (receiverId) => receiverId && receiverId !== exceptUserId && receiverId !== participantUserId,
      );
      receivers.forEach((receiverId) => {
        sendSignal(receiverId, call.callId, 'CALL_PARTICIPANT_UPDATE', {
          conversationId: call.groupConversationId,
          participantUserId,
          participantStatus,
          participantMicEnabled: mediaState?.micEnabled,
          participantCameraEnabled: mediaState?.cameraEnabled,
        });
      });
    },
    [sendSignal],
  );

  const armConnectTimeout = useCallback(
    (peerUserId: string, callId: string) => {
      clearConnectTimeout();
      connectTimeoutRef.current = window.setTimeout(() => {
        const activeGroupCall = activeCallRef.current?.groupConversationId ? activeCallRef.current : null;
        if (activeGroupCall) {
          closePeerConnection(peerUserId);
          if (connectedGroupParticipantIdsRef.current.size > 1 || activeGroupCall.direction === 'outgoing') return;
        }
        sendSignal(peerUserId, callId, 'CALL_END', {
          durationSec: calculateCallDurationSeconds(callStartedAtMs),
        });
        setErrorMessage('Kết nối cuộc gọi quá lâu. Vui lòng thử lại.');
        setStatus('ended');
        cleanup(true);
      }, CALL_CONNECT_TIMEOUT_MS);
    },
    [callStartedAtMs, clearConnectTimeout, cleanup, closePeerConnection, removeGroupParticipant, sendSignal],
  );

  useEffect(() => {
    const isGroupInvitationStillTiming =
      status === 'in_call' && Boolean(activeCallRef.current?.groupConversationId);
    if (!isGroupInvitationStillTiming && (status === 'in_call' || status === 'ended' || status === 'error' || status === 'idle')) {
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
          if (activeCallRef.current?.groupConversationId) {
            remoteStreamsByPeerRef.current.set(peerUserId, stream);
            setRemoteStreams(Array.from(remoteStreamsByPeerRef.current, ([userId, remote]) => ({ userId, stream: remote })));
            addGroupParticipant(peerUserId);
            setRemoteStream((prev) => prev ?? stream);
          } else {
            setRemoteStream(stream);
          }
          setStatus((prev) => (prev === 'connecting' || prev === 'calling' ? 'in_call' : prev));
        }
      };

      pc.oniceconnectionstatechange = () => {
        logWebRtc('iceConnectionState', { callId, state: pc.iceConnectionState });
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          clearConnectTimeout();
          hasRetriedIceRestartRef.current = false;
          if (activeCallRef.current?.groupConversationId) {
            addGroupParticipant(peerUserId);
          }
          setStatus('in_call');
        } else if (
          pc.iceConnectionState === 'failed' ||
          pc.iceConnectionState === 'closed'
        ) {
          const activeGroupCall = activeCallRef.current?.groupConversationId ? activeCallRef.current : null;
          if (activeGroupCall) {
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
                  sendSignal(peerUserId, callId, 'CALL_OFFER', {
                    sdp: offer.sdp ?? undefined,
                    conversationId: activeGroupCall.groupConversationId,
                  });
                } catch {
                  closePeerConnection(peerUserId);
                }
              })();
            } else {
              closePeerConnection(peerUserId);
            }
            return;
          }
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
          if (activeCallRef.current?.groupConversationId) {
            addGroupParticipant(peerUserId);
          }
          setStatus('in_call');
        } else if (
          pc.connectionState === 'failed' ||
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'closed'
        ) {
          const activeGroupCall = activeCallRef.current?.groupConversationId ? activeCallRef.current : null;
          if (activeGroupCall) {
            if (pc.connectionState === 'disconnected') {
              armConnectTimeout(peerUserId, callId);
              setStatus((prev) => (prev === 'in_call' ? 'connecting' : prev));
              return;
            }
            closePeerConnection(peerUserId);
            return;
          }
          setStatus('ended');
        }
      };

      peerConnectionsRef.current.set(peerUserId, pc);
      if (!peerRef.current) {
        peerRef.current = pc;
      }
      return pc;
    },
    [
      addGroupParticipant,
      armConnectTimeout,
      cleanup,
      clearConnectTimeout,
      closePeerConnection,
      logWebRtc,
      removeGroupParticipant,
      sendSignal,
    ],
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
      const nextCall: ActiveCall = { callId, peerUserId, peerDisplayName, peerAvatarUrl, direction: 'outgoing', mediaType };
      activeCallRef.current = nextCall;
      setActiveCall(nextCall);
      hasRetriedIceRestartRef.current = false;
      setCallStartedAtMs(null);
      setAuthoritativeSessionStatus('RINGING');
      setAuthoritativeDurationSec(null);
      setStatus('calling');
      const inviteSent = sendSignal(peerUserId, callId, 'CALL_INVITE', { mediaType });
      if (!inviteSent) {
        setErrorMessage('Mất kết nối realtime. Vui lòng đợi vài giây rồi thử gọi lại.');
        setStatus('error');
        cleanup(true);
        return;
      }
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
      groupParticipants?: GroupCallParticipantSignal[],
    ) => {
      if (!currentUserId) return;
      if (status !== 'idle' && status !== 'ended') return;

      const receivers = participantIds.filter((id) => id && id !== currentUserId);
      if (receivers.length === 0) return;

      setErrorMessage(null);

      const callId = existingCallId || createCallId();
      const nextCall: ActiveCall = {
        callId,
        peerUserId: receivers[0],
        peerDisplayName: groupDisplayName,
        peerAvatarUrl: groupAvatarUrl,
        groupConversationId: conversationId,
        participantIds: receivers,
        direction: 'outgoing',
        mediaType,
      };
      activeCallRef.current = nextCall;
      setActiveCall(nextCall);
      connectedGroupParticipantIdsRef.current = new Set([currentUserId]);
      settledGroupParticipantIdsRef.current.clear();
      const participants = uniqueParticipants(
        groupParticipants?.length
          ? groupParticipants
          : [
            {
              userId: currentUserId,
              name: groupDisplayName || 'Bạn',
              avatar: groupAvatarUrl,
            },
            ...receivers.map((receiverId) => ({ userId: receiverId, name: 'Người dùng' })),
          ],
      );
      setGroupCallParticipants(
        participants.map((participant) => ({
          userId: participant.userId,
          name: participant.name || 'Người dùng',
          avatar: participantAvatar(participant.name || 'Người dùng', participant.avatar),
          status: participant.userId === currentUserId ? 'joined' : 'ringing',
          micEnabled: true,
          cameraEnabled: mediaType === 'video',
          joinedAt: participant.userId === currentUserId ? Date.now() : undefined,
        })),
      );
      refreshGroupParticipantCount();
      hasRetriedIceRestartRef.current = false;
      setCallStartedAtMs(null);
      setAuthoritativeSessionStatus('RINGING');
      setAuthoritativeDurationSec(null);
      setStatus('calling');

      clearCallTimeout();
      callTimeoutRef.current = window.setTimeout(() => {
        callTimeoutRef.current = null;
        const currentCall = activeCallRef.current;
        const currentReceivers =
          currentCall?.callId === callId && currentCall.groupConversationId === conversationId
            ? currentCall.participantIds ?? receivers
            : receivers;
        const unansweredReceivers = currentReceivers.filter(
          (receiverId) =>
            receiverId &&
            !connectedGroupParticipantIdsRef.current.has(receiverId) &&
            !settledGroupParticipantIdsRef.current.has(receiverId),
        );
        const connectedReceivers = currentReceivers.filter((receiverId) =>
          connectedGroupParticipantIdsRef.current.has(receiverId),
        );

        if (connectedReceivers.length > 0 && currentCall?.groupConversationId === conversationId) {
          unansweredReceivers.forEach((receiverId) => {
            settledGroupParticipantIdsRef.current.add(receiverId);
            closePeerConnection(receiverId);
            updateGroupParticipant(receiverId, { status: 'missed', leftAt: Date.now() });
            sendSignal(receiverId, callId, 'CALL_CANCEL', {
              conversationId,
              participantUserId: receiverId,
              participantStatus: 'missed',
            });
          });
          connectedReceivers.forEach((receiverId) => {
            unansweredReceivers.forEach((missedUserId) => {
              sendSignal(receiverId, callId, 'CALL_PARTICIPANT_UPDATE', {
                conversationId,
                participantUserId: missedUserId,
                participantStatus: 'missed',
              });
            });
          });
          setStatus((prev) => (prev === 'calling' || prev === 'connecting' ? 'in_call' : prev));
          return;
        }

        currentReceivers.forEach((receiverId) => {
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
            const inviteSent = sendSignal(receiverId, callId, 'CALL_INVITE', {
              mediaType,
              conversationId,
              conversationName: groupDisplayName,
              conversationAvatarUrl: groupAvatarUrl,
              groupParticipants: participants,
            });
            if (!inviteSent) {
              throw new Error('Mất kết nối realtime. Vui lòng đợi vài giây rồi thử gọi lại.');
            }
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
              groupParticipants: participants,
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
      closePeerConnection,
      refreshGroupParticipantCount,
      sendSignal,
      status,
      updateGroupParticipant,
    ],
  );

  const rejectIncoming = useCallback(() => {
    if (!incomingSignal) return;
    sendSignal(incomingSignal.fromUserId, incomingSignal.callId, 'CALL_REJECT', {
      conversationId: incomingSignal.conversationId ?? undefined,
      groupParticipants: incomingSignal.groupParticipants,
    });
    cleanup();
  }, [cleanup, incomingSignal, sendSignal]);

  const acceptIncoming = useCallback(async () => {
    if (!incomingSignal || !currentUserId) return;
    const callId = incomingSignal.callId;
    const peerUserId = incomingSignal.fromUserId;
    const offerMediaType: CallMediaType = hasVideoInSdp(pendingOfferRef.current?.sdp) ? 'video' : incomingMediaType;

    setErrorMessage(null);
    const nextCall: ActiveCall = {
      callId,
      peerUserId,
      groupConversationId: incomingSignal.conversationId ?? undefined,
      peerDisplayName: incomingSignal.conversationName ?? undefined,
      peerAvatarUrl: incomingSignal.conversationAvatarUrl ?? undefined,
      direction: 'incoming',
      mediaType: offerMediaType,
    };
    activeCallRef.current = nextCall;
    setActiveCall(nextCall);
    if (incomingSignal.conversationId) {
      connectedGroupParticipantIdsRef.current = new Set([currentUserId, peerUserId]);
      updateGroupParticipant(currentUserId, { status: 'joined', joinedAt: Date.now(), leftAt: undefined });
      updateGroupParticipant(peerUserId, { status: 'joined', joinedAt: Date.now(), leftAt: undefined });
      refreshGroupParticipantCount();
    }
    hasRetriedIceRestartRef.current = false;
    setCallStartedAtMs(Date.now());
    setAuthoritativeSessionStatus('ONGOING');
    setAuthoritativeDurationSec(0);
    setStatus('connecting');
    setIncomingSignal(null);
    setIncomingMediaType('audio');
    sendSignal(peerUserId, callId, 'CALL_ACCEPT', {
      conversationId: incomingSignal.conversationId ?? undefined,
      groupParticipants: incomingSignal.groupParticipants,
    });
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
          groupParticipants: incomingSignal.groupParticipants,
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
    currentUserId,
    ensureLocalStream,
    incomingMediaType,
    incomingSignal,
    logWebRtc,
    refreshGroupParticipantCount,
    sendSignal,
    updateGroupParticipant,
  ]);

  const endCall = useCallback(() => {
    if (activeCall) {
      const hasJoinedGroupCall =
        Boolean(activeCall.groupConversationId) &&
        (activeCall.direction === 'incoming' ||
          connectedGroupParticipantIdsRef.current.size > 1 ||
          authoritativeSessionStatus === 'ONGOING');
      const endType: CallSignalType = status === 'in_call' || hasJoinedGroupCall ? 'CALL_END' : 'CALL_CANCEL';
      const durationSec =
        endType === 'CALL_END' ? calculateCallDurationSeconds(callStartedAtMs) : undefined;
      const receivers = activeCall.participantIds?.length ? activeCall.participantIds : [activeCall.peerUserId];
      receivers.forEach((receiverId) => {
        sendSignal(receiverId, activeCall.callId, endType, {
          conversationId: activeCall.groupConversationId,
          durationSec,
        });
      });
    } else if (incomingSignal) {
      sendSignal(incomingSignal.fromUserId, incomingSignal.callId, 'CALL_CANCEL', {
        conversationId: incomingSignal.conversationId ?? undefined,
      });
    }
    setStatus('ended');
    cleanup(true);
  }, [activeCall, authoritativeSessionStatus, callStartedAtMs, cleanup, incomingSignal, sendSignal, status]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsMuted(next);
    if (activeCall?.groupConversationId && currentUserId) {
      updateGroupParticipant(currentUserId, { micEnabled: !next });
      const mediaState = { micEnabled: !next, cameraEnabled: isCameraEnabled };
      if (activeCall.direction === 'outgoing') {
        broadcastGroupParticipantUpdate(activeCall, currentUserId, 'joined', currentUserId, mediaState);
      } else {
        sendSignal(activeCall.peerUserId, activeCall.callId, 'CALL_PARTICIPANT_UPDATE', {
          conversationId: activeCall.groupConversationId,
          participantUserId: currentUserId,
          participantStatus: 'joined',
          participantMicEnabled: mediaState.micEnabled,
          participantCameraEnabled: mediaState.cameraEnabled,
        });
      }
    }
  }, [activeCall, broadcastGroupParticipantUpdate, currentUserId, isCameraEnabled, isMuted, sendSignal, updateGroupParticipant]);

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
    if (activeCall?.groupConversationId && currentUserId) {
      updateGroupParticipant(currentUserId, { cameraEnabled: next });
      const mediaState = { micEnabled: !isMuted, cameraEnabled: next };
      if (activeCall.direction === 'outgoing') {
        broadcastGroupParticipantUpdate(activeCall, currentUserId, 'joined', currentUserId, mediaState);
      } else {
        sendSignal(activeCall.peerUserId, activeCall.callId, 'CALL_PARTICIPANT_UPDATE', {
          conversationId: activeCall.groupConversationId,
          participantUserId: currentUserId,
          participantStatus: 'joined',
          participantMicEnabled: mediaState.micEnabled,
          participantCameraEnabled: mediaState.cameraEnabled,
        });
      }
    }
  }, [activeCall, broadcastGroupParticipantUpdate, currentUserId, isCameraEnabled, isMuted, sendSignal, updateGroupParticipant]);

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
            if (signal.conversationId) {
              setGroupCallParticipants(
                buildGroupParticipants(
                  signal.groupParticipants,
                  signal.fromUserId,
                  signal.fromUsername,
                  signal.groupParticipants?.find((participant) => participant.userId === signal.fromUserId)?.avatar,
                  'ringing',
                ),
              );
            } else {
              setGroupCallParticipants([]);
            }
            applyAuthoritativeSnapshot({
              status: signal.sessionStatus,
              answeredAt: signal.sessionAnsweredAt,
              durationSec: signal.sessionDurationSec,
            });
            setStatus('ringing');
          } else {
            sendSignal(signal.fromUserId, signal.callId, 'CALL_REJECT', {
              conversationId: signal.conversationId ?? undefined,
            });
          }
          break;
        case 'CALL_CANCEL':
          if (incomingSignal?.callId === signal.callId || matchesByCallId) {
            if (matchesByCallId && activeCall?.groupConversationId && activeCall.direction === 'outgoing') {
              settledGroupParticipantIdsRef.current.add(signal.fromUserId);
              closePeerConnection(signal.fromUserId);
              removeGroupParticipant(signal.fromUserId);
              updateGroupParticipant(signal.fromUserId, { status: 'missed', leftAt: Date.now() });
              broadcastGroupParticipantUpdate(activeCall, signal.fromUserId, 'missed', signal.fromUserId);
              if (finishGroupCallIfAllReceiversSettled(activeCall, signal.fromUserId)) {
                break;
              }
              break;
            }
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
            if (matchesByCallId && activeCall?.groupConversationId && activeCall.direction === 'outgoing') {
              settledGroupParticipantIdsRef.current.add(signal.fromUserId);
              closePeerConnection(signal.fromUserId);
              removeGroupParticipant(signal.fromUserId);
              updateGroupParticipant(signal.fromUserId, { status: 'rejected', leftAt: Date.now() });
              broadcastGroupParticipantUpdate(activeCall, signal.fromUserId, 'rejected', signal.fromUserId);
              if (finishGroupCallIfAllReceiversSettled(activeCall, signal.fromUserId)) {
                break;
              }
              break;
            }
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
            if (matchesByCallId && activeCall?.groupConversationId && activeCall.direction === 'outgoing') {
              settledGroupParticipantIdsRef.current.add(signal.fromUserId);
              closePeerConnection(signal.fromUserId);
              removeGroupParticipant(signal.fromUserId);
              updateGroupParticipant(signal.fromUserId, { status: 'left', leftAt: Date.now() });
              if (connectedGroupParticipantIdsRef.current.size > 1) {
                broadcastGroupParticipantUpdate(activeCall, signal.fromUserId, 'left', signal.fromUserId);
                break;
              }
              sendSignal(signal.fromUserId, signal.callId, 'CALL_END', {
                conversationId: activeCall.groupConversationId,
                durationSec: calculateCallDurationSeconds(callStartedAtMs),
              });
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
        case 'CALL_ACCEPT':
          if (matchesByCallId && activeCall?.direction === 'outgoing') {
            if (activeCall.groupConversationId) {
              const participant = signal.groupParticipants?.find((item) => item.userId === signal.fromUserId);
              updateGroupParticipant(signal.fromUserId, {
                name: participant?.name || signal.fromUsername,
                avatar: participant?.avatar,
                status: 'joined',
                joinedAt: Date.now(),
                leftAt: undefined,
              });
              addGroupParticipant(signal.fromUserId);
              broadcastGroupParticipantUpdate(activeCall, signal.fromUserId, 'joined', signal.fromUserId);
            }
            setActiveCall((prev) =>
              prev && prev.callId === signal.callId
                ? {
                    ...prev,
                    peerDisplayName: prev.groupConversationId ? prev.peerDisplayName : prev.peerDisplayName || signal.fromUsername,
                  }
                : prev,
            );
            if (!activeCall.groupConversationId) {
              clearCallTimeout();
            }
            applyAuthoritativeSnapshot({
              status: signal.sessionStatus,
              answeredAt: signal.sessionAnsweredAt ?? signal.createdAt,
              durationSec: signal.sessionDurationSec,
            });
            setStatus('connecting');
            armConnectTimeout(signal.fromUserId, signal.callId);
          }
          break;
        case 'CALL_PARTICIPANT_UPDATE':
          if (
            (matchesByCallId || incomingSignal?.callId === signal.callId) &&
            (activeCall?.groupConversationId || incomingSignal?.conversationId) &&
            signal.participantUserId &&
            signal.participantStatus
          ) {
            updateGroupParticipant(signal.participantUserId, {
              status: signal.participantStatus,
              micEnabled: signal.participantMicEnabled,
              cameraEnabled: signal.participantCameraEnabled,
              joinedAt: signal.participantStatus === 'joined' ? Date.now() : undefined,
              leftAt:
                signal.participantStatus === 'left' ||
                signal.participantStatus === 'rejected' ||
                signal.participantStatus === 'missed'
                  ? Date.now()
                  : undefined,
            });
            if (activeCall?.groupConversationId && activeCall.direction === 'outgoing') {
              broadcastGroupParticipantUpdate(activeCall, signal.participantUserId, signal.participantStatus, signal.fromUserId, {
                micEnabled: signal.participantMicEnabled,
                cameraEnabled: signal.participantCameraEnabled,
              });
            }
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
              ? {
                  ...prev,
                  peerDisplayName: prev.groupConversationId ? prev.peerDisplayName : prev.peerDisplayName || signal.fromUsername,
                }
              : prev,
          );
          if (activeCall?.groupConversationId) {
            const participant = signal.groupParticipants?.find((item) => item.userId === signal.fromUserId);
            updateGroupParticipant(signal.fromUserId, {
              name: participant?.name || signal.fromUsername,
              avatar: participant?.avatar,
              status: 'joined',
              joinedAt: Date.now(),
              leftAt: undefined,
            });
            addGroupParticipant(signal.fromUserId);
          }
          if (!activeCall?.groupConversationId) {
            clearCallTimeout();
          }
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
      addGroupParticipant,
      applyAuthoritativeSnapshot,
      applyPendingIce,
      broadcastGroupParticipantUpdate,
      buildGroupParticipants,
      cleanup,
      clearCallTimeout,
      closePeerConnection,
      currentUserId,
      finishGroupCallIfAllReceiversSettled,
      incomingSignal,
      callStartedAtMs,
      logWebRtc,
      armConnectTimeout,
      removeGroupParticipant,
      sendSignal,
      status,
      toEpochMs,
      updateGroupParticipant,
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

  const handleCallError = useCallback((error: IncomingCallError) => {
    if (!error) return;
    const relatedCallId = error.callId ?? null;
    const isRelated =
      (relatedCallId && (activeCallRef.current?.callId === relatedCallId || incomingSignal?.callId === relatedCallId)) ||
      (!relatedCallId && (status === 'calling' || status === 'connecting' || status === 'ringing'));
    if (!isRelated) return;

    setErrorMessage(error.message || 'Cuộc gọi gặp lỗi');
    setStatus('error');
    cleanup(true);
  }, [cleanup, incomingSignal?.callId, status]);

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
      remoteStreams,
      groupCallParticipants,
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
      activeCallDirection: activeCall?.direction ?? null,
      activeGroupParticipantCount,
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
      handleCallError,
    }),
    [
      acceptIncoming,
      activeCall?.callId,
      activeCall?.groupConversationId,
      activeCall?.mediaType,
      activeCall?.peerAvatarUrl,
      activeCall?.peerDisplayName,
      activeCall?.peerUserId,
      activeCall?.direction,
      activeGroupParticipantCount,
      groupCallParticipants,
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
      remoteStreams,
      callStartedAtMs,
      authoritativeSessionStatus,
      authoritativeDurationSec,
      syncAuthoritativeSession,
      handleCallError,
      startCall,
      startGroupCall,
      status,
      toggleCamera,
      toggleMute,
    ],
  );
}


