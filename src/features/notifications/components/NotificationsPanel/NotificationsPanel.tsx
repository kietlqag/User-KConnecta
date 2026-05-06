import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { NotificationItem } from '../NotificationItem';
import { NotificationFilter } from '../../types/notifications.types';
import { notificationService } from '../../../../services/notificationService';
import { authService } from '../../../../services/authService';
import { useNotifications } from '../../useNotifications';

interface NotificationsPanelProps {
  onClose: () => void;
}

export const NotificationsPanel = ({ onClose }: NotificationsPanelProps) => {
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const currentUser = authService.getCurrentUser();

  const { notifications, isLoading, markAsRead, markAllAsRead, updateNotification } = useNotifications();

  const handleAcceptInvite = async (notificationId: string, relatedId: string) => {
    try {
      await notificationService.acceptGroupInvite(relatedId, notificationId, currentUser?.id as string);
      updateNotification(notificationId, { isActioned: true, isUnread: false });
      window.dispatchEvent(new Event('notification:refresh'));
    } catch (error) {
      console.error('Failed to accept invite:', error);
    }
  };

  const handleRejectInvite = async (notificationId: string, relatedId: string) => {
    try {
      await notificationService.rejectGroupInvite(relatedId, notificationId);
      updateNotification(notificationId, { isActioned: true, isUnread: false });
      window.dispatchEvent(new Event('notification:refresh'));
    } catch (error) {
      console.error('Failed to reject invite:', error);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return n.isUnread;
    return true;
  });

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="fixed top-14 right-4 w-[360px] bg-white rounded-lg shadow-2xl z-50 max-h-[calc(100vh-80px)] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Thông báo</h2>
            <div className="flex items-center gap-2">
              {notifications.some((n) => n.isUnread) && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 font-medium hover:underline cursor-pointer"
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
              <button className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer">
                <MoreHorizontal className="w-5 h-5 text-gray-600" />
              </button>
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
                onRead={markAsRead}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              {activeFilter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200">
          <button className="w-full text-center text-blue-600 hover:bg-gray-100 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
            Xem tất cả thông báo
          </button>
        </div>
      </div>
    </>
  );
};
