import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { NotificationItem } from '../NotificationItem';
import { Notification, NotificationFilter } from '../../types/notifications.types';

interface NotificationsPanelProps {
  onClose: () => void;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'like',
    user: {
      name: 'Liên Quân Mobile Trại Nghiêm Game Đua Top',
      avatar: 'https://images.unsplash.com/photo-1728226773012-19303e779077?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtZXNlJTIwd29tYW4lMjBzbWlsaW5nfGVufDF8fHx8MTc2OTY3MDY4MHww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    text: 'Truyền Tết 2026 🧧 đẹp quá cũng sở nhà i cre New...',
    timestamp: '2 ngày',
    isUnread: true,
  },
  {
    id: '2',
    type: 'comment',
    user: {
      name: 'Huy Huỳnh',
      avatar: 'https://images.unsplash.com/photo-1747625119730-5e46501418b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtZXNlJTIwbWFuJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc2OTY3MDY3OXww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    text: 'đã nhắc đến bạn và những người khác trong một bình luận trong Việt Nam Glory Clas...',
    timestamp: '17 giờ',
    isUnread: true,
  },
  {
    id: '3',
    type: 'friend_request',
    user: {
      name: 'Nguyễt Nhi',
      avatar: 'https://images.unsplash.com/photo-1641351611696-33958c9e02a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMHdvbWFuJTIwcG9ydHJhaXQlMjBoYXBweXxlbnwxfHx8fDE3Njk2NTI3MDh8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    text: 'Bạn có một gợi ý kết bạn mới',
    timestamp: '1 ngày',
    isUnread: true,
  },
  {
    id: '4',
    type: 'group_activity',
    user: {
      name: 'Hoàng Thủy Trang',
      avatar: 'https://images.unsplash.com/photo-1728226773012-19303e779077?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtZXNlJTIwd29tYW4lMjBzbWlsaW5nfGVufDF8fHx8MTc2OTY3MDY4MHww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    text: 'đã chia sẻ bài viết của Đời Má',
    timestamp: '4 ngày',
    isUnread: true,
  },
  {
    id: '5',
    type: 'like',
    user: {
      name: 'Hoàng Thủy Trang',
      avatar: 'https://images.unsplash.com/photo-1728226773012-19303e779077?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtZXNlJTIwd29tYW4lMjBzbWlsaW5nfGVufDF8fHx8MTc2OTY3MDY4MHww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    text: 'đã chia sẻ bài viết của Đời Má',
    timestamp: '1 tuần',
    isUnread: false,
  },
  {
    id: '6',
    type: 'event',
    user: {
      name: 'UTE TV - Kênh truyền hình Trường Đại học Công nghệ Kỹ thuật',
      avatar: 'https://images.unsplash.com/photo-1607749111659-e1c8e05f5f24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncm91cCUyMHBlb3BsZSUyMGZyaWVuZHN8ZW58MXx8fHwxNzY5NjcwNjgxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    text: 'TRPCH lớp học mới sư kiểm...',
    timestamp: '1 tuần',
    isUnread: true,
  },
  {
    id: '7',
    type: 'share',
    user: {
      name: 'Mai Phương',
      avatar: 'https://images.unsplash.com/photo-1641351611696-33958c9e02a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMHdvbWFuJTIwcG9ydHJhaXQlMjBoYXBweXxlbnwxfHx8fDE3Njk2NTI3MDh8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    text: 'đã chia sẻ bài viết của bạn',
    timestamp: '2 tuần',
    isUnread: false,
  },
  {
    id: '8',
    type: 'birthday',
    user: {
      name: 'Trần Đức Anh',
      avatar: 'https://images.unsplash.com/photo-1747625119730-5e46501418b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtZXNlJTIwbWFuJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc2OTY3MDY3OXww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    text: 'có sinh nhật hôm nay. Gửi lời chúc mừng đến bạn ấy!',
    timestamp: '3 tuần',
    isUnread: false,
  },
  {
    id: '9',
    type: 'memory',
    user: {
      name: 'Kỷ niệm Facebook',
      avatar: 'https://images.unsplash.com/photo-1607749111659-e1c8e05f5f24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncm91cCUyMHBlb3BsZSUyMGZyaWVuZHN8ZW58MXx8fHwxNzY5NjcwNjgxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    text: 'Bạn có kỷ niệm mới với Nguyễn Văn Minh và 3 người khác',
    timestamp: '1 tháng',
    isUnread: false,
  },
];

export const NotificationsPanel = ({ onClose }: NotificationsPanelProps) => {
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');

  const filteredNotifications = mockNotifications.filter((notif) => {
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
              <NotificationItem key={notification.id} notification={notification} />
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
