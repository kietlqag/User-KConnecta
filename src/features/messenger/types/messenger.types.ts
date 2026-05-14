export interface Conversation {
  id: string;          // friendshipId
  user: {
    id: string;        // userId (UUID) - dùng làm receiverId khi gửi tin
    name: string;
    avatar: string;
    isOnline?: boolean;
    lastActiveAt?: string;
  };
  lastMessage: string;
  timestamp: string;
  lastActivityAt?: number;
  isUnread: boolean;
  unreadCount?: number;
  isGroup?: boolean;
  themeColor?: string | null;
}

export type MessengerFilter = 'all' | 'unread' | 'groups';


