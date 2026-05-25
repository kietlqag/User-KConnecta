import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Notification } from '../../types/notifications.types';

interface NotificationItemProps {
  notification: Notification;
  onAcceptInvite?: (notificationId: string, relatedId: string) => void;
  onRejectInvite?: (notificationId: string, relatedId: string) => void;
  onAcceptFriendRequest?: (notificationId: string, friendshipId: string) => void;
  onRejectFriendRequest?: (notificationId: string, friendshipId: string) => void;
  onRead?: (notificationId: string) => void;
}

export const NotificationItem = ({
  notification,
  onAcceptInvite,
  onRejectInvite,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  onRead
}: NotificationItemProps) => {
  const navigate = useNavigate();
  const [friendLoading, setFriendLoading] = useState<'accept' | 'reject' | null>(null);
  const [inviteLoading, setInviteLoading] = useState<'accept' | 'reject' | null>(null);

  const handleViewProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.user.id) {
      navigate(`/profile/${notification.user.id}`);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const diffMs = Date.now() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });

      if (diffSec < 60) return 'Vừa xong';
      if (diffMin < 60) return rtf.format(-diffMin, 'minute');
      if (diffHour < 24) return rtf.format(-diffHour, 'hour');
      if (diffDay < 7) return rtf.format(-diffDay, 'day');

      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const POST_TYPES = new Set(['like', 'comment', 'share', 'mention']);

  const handleClick = () => {
    if (notification.isUnread && onRead) {
      onRead(notification.id);
    }
    if (POST_TYPES.has(notification.type) && notification.relatedId) {
      navigate(`/home?post=${notification.relatedId}`);
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
          onClick={handleViewProfile}
          className={`w-14 h-14 rounded-full object-cover ${notification.user.id ? 'cursor-pointer hover:opacity-90' : ''}`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm text-gray-900 leading-snug mb-1">
          <span
            onClick={handleViewProfile}
            className={`font-semibold ${notification.user.id ? 'cursor-pointer hover:underline' : ''}`}
          >{notification.user.name}</span>{' '}
          {notification.text}
        </p>
        <span className="text-xs text-blue-600 font-medium">{formatDate(notification.timestamp)}</span>

        {/* Group Invite Actions */}
        {notification.type === 'group_invite' && !notification.isActioned && (
          <div className="flex items-center gap-2 mt-2">
            <button
              disabled={inviteLoading !== null}
              onClick={async (e) => {
                e.stopPropagation();
                if (!notification.relatedId || !onAcceptInvite) return;
                setInviteLoading('accept');
                try {
                  await onAcceptInvite(notification.id, notification.relatedId);
                } finally {
                  setInviteLoading(null);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {inviteLoading === 'accept' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Chấp nhận
            </button>
            <button
              disabled={inviteLoading !== null}
              onClick={async (e) => {
                e.stopPropagation();
                if (!notification.relatedId || !onRejectInvite) return;
                setInviteLoading('reject');
                try {
                  await onRejectInvite(notification.id, notification.relatedId);
                } finally {
                  setInviteLoading(null);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-red-100 hover:bg-red-200 disabled:opacity-60 disabled:cursor-not-allowed text-red-600 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {inviteLoading === 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Từ chối
            </button>
          </div>
        )}

        {/* Friend Request Actions */}
        {notification.type === 'friend_request' && !notification.isActioned && (
          <div className="flex items-center gap-2 mt-2">
            <button
              disabled={friendLoading !== null}
              onClick={async (e) => {
                e.stopPropagation();
                if (!notification.relatedId || !onAcceptFriendRequest) return;
                setFriendLoading('accept');
                try {
                  await onAcceptFriendRequest(notification.id, notification.relatedId);
                } finally {
                  setFriendLoading(null);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {friendLoading === 'accept' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Chấp nhận
            </button>
            <button
              disabled={friendLoading !== null}
              onClick={async (e) => {
                e.stopPropagation();
                if (!notification.relatedId || !onRejectFriendRequest) return;
                setFriendLoading('reject');
                try {
                  await onRejectFriendRequest(notification.id, notification.relatedId);
                } finally {
                  setFriendLoading(null);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-200 hover:bg-gray-300 disabled:opacity-60 disabled:cursor-not-allowed text-gray-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {friendLoading === 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
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
