export interface Message {
  id: string;
  senderId: string; // userId (UUID)
  text: string;
  replyPreview?: string;
  replyToMessageId?: string;
  voiceAudioUrl?: string;
  voiceDurationSec?: number;
  voiceMimeType?: string;
  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
  imageUrl?: string;
  imageUrls?: string[];
  imageMimeType?: string;
  imageCaption?: string;
  timestamp: Date;
  isOwn: boolean;
  deliveryStatus?: 'SENT' | 'DELIVERED' | 'SEEN';
  seenAt?: string;
  reactions?: string[];
  deleted?: boolean;
  deletedAt?: string;
  systemType?: 'call_log' | 'missed_call';
  callLogKind?: 'missed' | 'completed';
  callDurationSec?: number;
  callMediaType?: 'audio' | 'video';
}

export interface ChatUser {
  id: string; // userId (UUID) dùng làm receiverId
  name: string;
  fullName?: string;
  nickname?: string | null;
  avatar: string;
  isOnline: boolean;
  lastActiveAt?: string;
}

/** Shape của message nhận từ backend qua WebSocket */
export interface IncomingChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  receiverId?: string | null;
  conversationId?: string | null;
  content: string;
  createdAt: string; // ISO datetime
  delivered?: boolean;
  seen?: boolean;
  seenAt?: string;
  deleted?: boolean;
  deletedAt?: string;
  reactions?: string[];
}

export interface IncomingMessageStatus {
  messageId: string;
  senderId: string;
  receiverId: string;
  status: 'DELIVERED' | 'SEEN';
  updatedAt?: string;
}

export interface IncomingPresenceStatus {
  userId: string;
  online: boolean;
  lastActiveAt?: string;
}

export interface IncomingPinnedMessage {
  id?: string | null;
  peerUserId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  pinnedBy?: string | null;
  pinnedAt?: string | null;
  senderId?: string | null;
  senderName?: string | null;
  senderAvatarUrl?: string | null;
  messagePreview?: string | null;
  messageCreatedAt?: string | null;
  pinned: boolean;
}

export type CallSignalType =
  | 'CALL_INVITE'
  | 'CALL_ACCEPT'
  | 'CALL_REJECT'
  | 'CALL_CANCEL'
  | 'CALL_END'
  | 'CALL_PARTICIPANT_UPDATE'
  | 'CALL_OFFER'
  | 'CALL_ANSWER'
  | 'CALL_ICE';

export type GroupCallParticipantStatus = 'invited' | 'ringing' | 'joined' | 'left' | 'rejected' | 'missed';

export interface GroupCallParticipant {
  userId: string;
  name: string;
  avatar?: string;
  status: GroupCallParticipantStatus;
  micEnabled: boolean;
  cameraEnabled: boolean;
  joinedAt?: number;
  leftAt?: number;
}

export interface GroupCallParticipantSignal {
  userId: string;
  name: string;
  avatar?: string;
}

export interface OutgoingCallSignal {
  receiverId: string;
  conversationId?: string;
  conversationName?: string;
  conversationAvatarUrl?: string;
  callId: string;
  type: CallSignalType;
  mediaType?: 'audio' | 'video';
  sdp?: string;
  candidate?: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
  durationSec?: number;
  groupParticipants?: GroupCallParticipantSignal[];
  participantUserId?: string;
  participantStatus?: GroupCallParticipantStatus;
}

export interface IncomingCallSignal {
  callId: string;
  fromUserId: string;
  toUserId: string;
  conversationId?: string | null;
  conversationName?: string | null;
  conversationAvatarUrl?: string | null;
  fromUsername: string;
  type: CallSignalType;
  mediaType?: 'audio' | 'video';
  sdp?: string;
  candidate?: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
  groupParticipants?: GroupCallParticipantSignal[];
  participantUserId?: string;
  participantStatus?: GroupCallParticipantStatus;
  createdAt: string;
  sessionStatus?: 'RINGING' | 'ONGOING' | 'MISSED' | 'COMPLETED';
  sessionMediaType?: 'audio' | 'video';
  sessionStartedAt?: string;
  sessionAnsweredAt?: string;
  sessionEndedAt?: string;
  sessionDurationSec?: number;
}
