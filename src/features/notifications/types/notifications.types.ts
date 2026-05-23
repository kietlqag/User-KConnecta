export type NotificationType = 
  | 'like' 
  | 'comment' 
  | 'share' 
  | 'friend_request' 
  | 'group_activity' 
  | 'group_invite'
  | 'mention' 
  | 'birthday'
  | 'event'
  | 'memory'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  user: {
    id?: string;
    name: string;
    avatar: string;
  };
  text: string;
  timestamp: string;
  isUnread: boolean;
  actionUrl?: string;
  isActioned?: boolean;
  relatedId?: string;
}

export type NotificationFilter = 'all' | 'unread';
