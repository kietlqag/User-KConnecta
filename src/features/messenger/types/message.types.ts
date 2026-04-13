export interface Message {
  id: string;
  senderId: string; // userId (UUID)
  text: string;
  timestamp: Date;
  isOwn: boolean;
  reactions?: string[];
  systemType?: 'call_log' | 'missed_call';
  callLogKind?: 'missed' | 'completed';
  callDurationSec?: number;
  callMediaType?: 'audio' | 'video';
}

export interface ChatUser {
  id: string; // userId (UUID) dùng làm receiverId
  name: string;
  avatar: string;
  isOnline: boolean;
}

/** Shape của message nhận từ backend qua WebSocket */
export interface IncomingChatMessage {
  senderId: string;
  senderUsername: string;
  receiverId: string;
  content: string;
  createdAt: string; // ISO datetime
}

export type CallSignalType =
  | 'CALL_INVITE'
  | 'CALL_ACCEPT'
  | 'CALL_REJECT'
  | 'CALL_CANCEL'
  | 'CALL_END'
  | 'CALL_OFFER'
  | 'CALL_ANSWER'
  | 'CALL_ICE';

export interface OutgoingCallSignal {
  receiverId: string;
  callId: string;
  type: CallSignalType;
  mediaType?: 'audio' | 'video';
  sdp?: string;
  candidate?: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
}

export interface IncomingCallSignal {
  callId: string;
  fromUserId: string;
  toUserId: string;
  fromUsername: string;
  type: CallSignalType;
  mediaType?: 'audio' | 'video';
  sdp?: string;
  candidate?: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
  createdAt: string;
}
