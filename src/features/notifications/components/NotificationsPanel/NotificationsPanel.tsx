import { useState } from 'react';
import { toast } from 'sonner';
import { NotificationItem } from '../NotificationItem';
import { NotificationFilter } from '../../types/notifications.types';
import { notificationService } from '../../../../services/notificationService';
import { authService } from '../../../../services/authService';
import { friendService, FRIENDSHIP_CHANGED_EVENT } from '../../../../services/friendService';
import { useNotifications } from '../../useNotifications';

interface NotificationsPanelProps {
  onClose: () => void;
}

export const NotificationsPanel = ({ onClose }: NotificationsPanelProps) => {
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const currentUser = authService.getCurrentUser();

  const { notifications, isLoading, markAsRead, markAllAsRead, updateNotification, updateNotificationsByRelatedId } = useNotifications();

  const handleAcceptInvite = async (notificationId: string, relatedId: string) => {
    try {
      await notificationService.acceptGroupInvite(relatedId, notificationId, currentUser?.id as string);
      updateNotificationsByRelatedId(relatedId, { isActioned: true, isUnread: false });
      window.dispatchEvent(new Event('notification:refresh'));
      toast.success('Đã tham gia nhóm');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể chấp nhận lời mời vào nhóm');
    }
  };

  const handleRejectInvite = async (notificationId: string, relatedId: string) => {
    try {
      await notificationService.rejectGroupInvite(relatedId, notificationId);
      updateNotificationsByRelatedId(relatedId, { isActioned: true, isUnread: false });
      window.dispatchEvent(new Event('notification:refresh'));
      toast.success('Đã từ chối lời mời vào nhóm');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể từ chối lời mời vào nhóm');
    }
  };

  const handleAcceptFriendRequest = async (notificationId: string, friendshipId: string) => {
    try {
      await friendService.acceptFriendRequest(friendshipId);
      updateNotificationsByRelatedId(friendshipId, { isActioned: true, isUnread: false });
      window.dispatchEvent(new Event(FRIENDSHIP_CHANGED_EVENT));
      toast.success('Đã chấp nhận lời mời kết bạn');
    } catch (error: any) {
      if (error?.status === 404) {
        updateNotificationsByRelatedId(friendshipId, { isActioned: true, isUnread: false });
        return;
      }
      toast.error(error?.message || 'Không thể chấp nhận lời mời kết bạn');
    }
  };

  const handleRejectFriendRequest = async (notificationId: string, friendshipId: string) => {
    try {
      await friendService.deleteFriendship(friendshipId);
      updateNotificationsByRelatedId(friendshipId, { isActioned: true, isUnread: false });
      toast.success('Đã từ chối lời mời kết bạn');
    } catch (error: any) {
      if (error?.status === 404) {
        updateNotificationsByRelatedId(friendshipId, { isActioned: true, isUnread: false });
        return;
      }
      toast.error(error?.message || 'Không thể từ chối lời mời kết bạn');
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (n.type === 'friend_removed') return false;
    if (activeFilter === 'unread') return n.isUnread;
    return true;
  });

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="fixed top-14 right-4 w-[360px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl z-50 max-h-[calc(100vh-80px)] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold dark:text-white">Thông báo</h2>
            <div className="flex items-center gap-2">
              {notifications.some((n) => n.isUnread) && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 font-medium hover:underline cursor-pointer"
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                activeFilter === 'unread'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Chưa đọc
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500 text-sm">Đang tải thông báo...</div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onAcceptInvite={handleAcceptInvite}
                onRejectInvite={handleRejectInvite}
                onAcceptFriendRequest={handleAcceptFriendRequest}
                onRejectFriendRequest={handleRejectFriendRequest}
                onRead={markAsRead}
                onClose={onClose}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              {activeFilter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full text-center text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </>
  );
};
