import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/shared';
import { Notification } from '../../types/notifications.types';
import { NotificationDetailDialog } from '../NotificationDetailDialog';

interface NotificationItemProps {
  notification: Notification;
  onAcceptInvite?: (notificationId: string, relatedId: string) => void;
  onRejectInvite?: (notificationId: string, relatedId: string) => void;
  onAcceptFriendRequest?: (notificationId: string, friendshipId: string) => void;
  onRejectFriendRequest?: (notificationId: string, friendshipId: string) => void;
  onRead?: (notificationId: string) => void;
  onClose?: () => void;
}

export const NotificationItem = ({
  notification,
  onAcceptInvite,
  onRejectInvite,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  onRead,
  onClose,
}: NotificationItemProps) => {
  const navigate = useNavigate();
  const [friendLoading, setFriendLoading] = useState<'accept' | 'reject' | null>(null);
  const [inviteLoading, setInviteLoading] = useState<'accept' | 'reject' | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

    if (notification.type === 'system') {
      setDetailOpen(true);
      return;
    }

    if (POST_TYPES.has(notification.type) && notification.relatedId) {
      onClose?.();
      navigate(`/home?post=${notification.relatedId}`);
    } else if (notification.type === 'group_join_request' && notification.relatedId) {
      onClose?.();
      navigate(`/groups/${notification.relatedId}?tab=requests`);
    } else if (notification.type === 'group_activity' && notification.relatedId) {
      onClose?.();
      navigate(`/groups/${notification.relatedId}`);
    } else if (notification.type === 'event' && notification.relatedId) {
      onClose?.();
      navigate(`/home?post=${notification.relatedId}`);
    } else if (notification.type === 'friend_accepted' && notification.user.id) {
      onClose?.();
      navigate(`/profile/${notification.user.id}`);
    } else if ((notification.type === 'birthday' || notification.type === 'birthday_wish') && notification.user.id) {
      onClose?.();
      navigate(`/friends?tab=birthdays`);
    } else {
      setDetailOpen(true);
    }
  };
  return (
    <>
    <div
      onClick={handleClick}
      className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-muted transition-colors cursor-pointer ${ notification.isUnread ? 'bg-accent' : '' }`}
    >
      {/* Avatar */}
      <div
        className={`relative h-14 w-14 shrink-0 ${notification.user.id ? 'cursor-pointer' : ''}`}
        onClick={handleViewProfile}
      >
        <UserAvatar
          name={notification.user.name}
          avatarUrl={notification.user.avatar}
          userId={notification.user.id}
          rounded="full"
          className="h-14 w-14"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm text-foreground leading-snug mb-1">
          <span
            onClick={handleViewProfile}
            className={`font-semibold ${notification.user.id ? 'cursor-pointer hover:underline' : ''}`}
          >{notification.user.name}</span>{' '}
          {notification.text}
        </p>
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{formatDate(notification.timestamp)}</span>

        {/* Group Invite Actions */}
        {notification.type === 'group_invite' && !notification.isActioned && (
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              disabled={inviteLoading !== null}
              onClick={async (e) => {
                e.stopPropagation();
                if (!notification.relatedId) { toast.error('Thông tin lời mời không hợp lệ'); return; }
                if (!onAcceptInvite) return;
                setInviteLoading('accept');
                try {
                  await onAcceptInvite(notification.id, notification.relatedId);
                } finally {
                  setInviteLoading(null);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {inviteLoading === 'accept' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Chấp nhận
            </button>
            <button
              type="button"
              disabled={inviteLoading !== null}
              onClick={async (e) => {
                e.stopPropagation();
                if (!notification.relatedId) { toast.error('Thông tin lời mời không hợp lệ'); return; }
                if (!onRejectInvite) return;
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
              type="button"
              disabled={friendLoading !== null}
              onClick={async (e) => {
                e.stopPropagation();
                if (!notification.relatedId) { toast.error('Thông tin lời mời kết bạn không hợp lệ'); return; }
                if (!onAcceptFriendRequest) return;
                setFriendLoading('accept');
                try {
                  await onAcceptFriendRequest(notification.id, notification.relatedId);
                } finally {
                  setFriendLoading(null);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {friendLoading === 'accept' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Chấp nhận
            </button>
            <button
              type="button"
              disabled={friendLoading !== null}
              onClick={async (e) => {
                e.stopPropagation();
                if (!notification.relatedId) { toast.error('Thông tin lời mời kết bạn không hợp lệ'); return; }
                if (!onRejectFriendRequest) return;
                setFriendLoading('reject');
                try {
                  await onRejectFriendRequest(notification.id, notification.relatedId);
                } finally {
                  setFriendLoading(null);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-muted hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed text-foreground text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {friendLoading === 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Từ chối
            </button>
          </div>
        )}
      </div>

      {/* Unread Indicator */}
      {notification.isUnread && (
        <div className="flex-shrink-0 w-3 h-3 bg-emerald-600 rounded-full mt-2" />
      )}
    </div>

    <NotificationDetailDialog
      notification={notification}
      open={detailOpen}
      onOpenChange={setDetailOpen}
      onClosePanel={onClose}
    />
    </>
  );
};
