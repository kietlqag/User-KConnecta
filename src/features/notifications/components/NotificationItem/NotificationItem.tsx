import { Notification } from '../../types/notifications.types';

interface NotificationItemProps {
  notification: Notification;
  onAcceptInvite?: (notificationId: string, relatedId: string) => void;
  onRejectInvite?: (notificationId: string, relatedId: string) => void;
  onRead?: (notificationId: string) => void;
}

export const NotificationItem = ({ 
  notification, 
  onAcceptInvite, 
  onRejectInvite,
  onRead
}: NotificationItemProps) => {

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.RelativeTimeFormat('vi', { numeric: 'auto' }).format(
        Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        'day'
      ).replace('trước', 'trước').replace('sau', 'nữa');
    } catch {
      return dateString; // Fallback to raw string if not a date
    }
  };

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.relatedId && onAcceptInvite) {
      onAcceptInvite(notification.id, notification.relatedId);
    }
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.relatedId && onRejectInvite) {
      onRejectInvite(notification.id, notification.relatedId);
    }
  };

  const handleClick = () => {
    if (notification.isUnread && onRead) {
      onRead(notification.id);
    }
  };
  return (
    <div 
      onClick={handleClick}
      className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-100 transition-colors cursor-pointer ${
        notification.isUnread ? 'bg-blue-50' : ''
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <img
          src={notification.user.avatar}
          alt={notification.user.name}
          className="w-14 h-14 rounded-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm text-gray-900 leading-snug mb-1">
          <span className="font-semibold">{notification.user.name}</span>{' '}
          {notification.text}
        </p>
        <span className="text-xs text-blue-600 font-medium">{formatDate(notification.timestamp)}</span>

        {/* Group Invite Actions */}
        {notification.type === 'group_invite' && !notification.isActioned && (
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleAccept}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Chấp nhận
            </button>
            <button
              onClick={handleReject}
              className="px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Từ chối
            </button>
          </div>
        )}
      </div>

      {/* Unread Indicator */}
      {notification.isUnread && (
        <div className="flex-shrink-0 w-3 h-3 bg-blue-600 rounded-full mt-2" />
      )}
    </div>
  );
};
