import { useState, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { NotificationItem } from '../NotificationItem';
import { Notification, NotificationFilter } from '../../types/notifications.types';
import { notificationService } from '../../../../services/notificationService';
import { authService } from '../../../../services/authService';

interface NotificationsPanelProps {
  onClose: () => void;
}

export const NotificationsPanel = ({ onClose }: NotificationsPanelProps) => {
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUser] = useState(() => authService.getCurrentUser());

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser]);

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getNotifications(currentUser?.id as string);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    }
  };

  const handleAcceptInvite = async (notificationId: string, relatedId: string) => {
    try {
      await notificationService.acceptGroupInvite(relatedId, notificationId, currentUser?.id as string);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isActioned: true, isUnread: false } : n));
      window.dispatchEvent(new Event('notification:refresh'));
    } catch (error) {
      console.error('Failed to accept invite:', error);
    }
  };

  const handleRejectInvite = async (notificationId: string, relatedId: string) => {
    try {
      await notificationService.rejectGroupInvite(relatedId, notificationId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isActioned: true, isUnread: false } : n));
      window.dispatchEvent(new Event('notification:refresh'));
    } catch (error) {
      console.error('Failed to reject invite:', error);
    }
  };

  const handleRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isUnread: false } : n));
      window.dispatchEvent(new Event('notification:refresh'));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (activeFilter === 'unread' && !notif.isUnread) return false;
    return true;
  });

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-14 right-4 w-[360px] bg-white rounded-lg shadow-2xl z-50 max-h-[calc(100vh-80px)] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Thông báo</h2>
            <button className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
              <MoreHorizontal className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeFilter === 'all'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeFilter === 'unread'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Chưa đọc
            </button>
          </div>
        </div>

        {/* New Section */}
        <div className="px-4 pt-3 pb-2">
          <h3 className="text-base font-semibold">Mới</h3>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <NotificationItem 
                key={notification.id} 
                notification={notification} 
                onAcceptInvite={handleAcceptInvite}
                onRejectInvite={handleRejectInvite}
                onRead={handleRead}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              Không có thông báo chưa đọc
            </div>
          )}
        </div>

        {/* Earlier Section */}
        <div className="px-4 py-2 border-t border-gray-200">
          <h3 className="text-base font-semibold">Trước đó</h3>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200">
          <button className="w-full text-center text-blue-600 hover:bg-gray-100 py-2 rounded-lg text-sm font-medium transition-colors">
            Xem tất cả thông báo
          </button>
        </div>
      </div>
    </>
  );
};
