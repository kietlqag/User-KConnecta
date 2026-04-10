export interface Conversation {
  id: string;          // friendshipId
  user: {
    id: string;        // userId (UUID) — dùng làm receiverId khi gửi tin
    name: string;
    avatar: string;
  };
  lastMessage: string;
  timestamp: string;
  isUnread: boolean;
  isGroup?: boolean;
}

export type MessengerFilter = 'all' | 'unread' | 'groups';
