import { Notification } from '../../types/notifications.types';

interface NotificationItemProps {
  notification: Notification;
}

export const NotificationItem = ({ notification }: NotificationItemProps) => {
  return (
    <button 
      className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-100 transition-colors ${
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
        <span className="text-xs text-blue-600 font-medium">{notification.timestamp}</span>
      </div>

      {/* Unread Indicator */}
      {notification.isUnread && (
        <div className="flex-shrink-0 w-3 h-3 bg-blue-600 rounded-full mt-2" />
      )}
    </button>
  );
};
