export interface Conversation {
  id: string;          // friendshipId
  user: {
    id: string;        // userId (UUID) - dung lam receiverId khi gui tin
    name: string;
    avatar: string;
    isOnline?: boolean;
    lastActiveAt?: string;
  };
  lastMessage: string;
  timestamp: string;
  lastActivityAt?: number;
  isUnread: boolean;
  isGroup?: boolean;
  themeColor?: string | null;
}

export type MessengerFilter = 'all' | 'unread' | 'groups';
