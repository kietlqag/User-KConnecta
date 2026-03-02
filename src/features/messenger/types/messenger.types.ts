export interface Conversation {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  lastMessage: string;
  timestamp: string;
  isUnread: boolean;
  isGroup?: boolean;
}

export type MessengerFilter = 'all' | 'unread' | 'groups';
