export type NotificationType = 
  | 'like' 
  | 'comment' 
  | 'share' 
  | 'friend_request' 
  | 'group_activity' 
  | 'mention' 
  | 'birthday'
  | 'event'
  | 'memory';

export interface Notification {
  id: string;
  type: NotificationType;
  user: {
    name: string;
    avatar: string;
  };
  text: string;
  timestamp: string;
  isUnread: boolean;
  actionUrl?: string;
}

export type NotificationFilter = 'all' | 'unread';
