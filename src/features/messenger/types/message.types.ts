export interface Message {
  id: string;
  senderId: string;   // userId (UUID)
  text: string;
  timestamp: Date;
  isOwn: boolean;
  reactions?: string[];
}

export interface ChatUser {
  id: string;         // userId (UUID) — dùng làm receiverId
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
  createdAt: string;  // ISO datetime
}
