export type NotificationType =
  | 'like'
  | 'comment'
  | 'share'
  | 'friend_request'
  | 'friend_accepted'
  | 'friend_removed'
  | 'group_activity'
  | 'group_invite'
  | 'group_join_request'
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
