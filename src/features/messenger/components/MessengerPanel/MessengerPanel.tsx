import { useState, useRef, useEffect } from 'react';
import { Search, MoreHorizontal, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConversationItem } from '../ConversationItem';
import { ChatWindow } from '../ChatWindow';
import { Conversation, MessengerFilter } from '../../types/messenger.types';
import { ChatUser } from '../../types/message.types';

interface MessengerPanelProps {
  onClose: () => void;
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    user: {
      name: 'Hoàng Ngọc Lam',
      avatar: 'https://images.unsplash.com/photo-1649589244330-09ca58e4fa64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc2OTU4OTUwM3ww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    lastMessage: 'Bạn và Lam thấn với là bạn bè · 7 năm',
    timestamp: '7 năm',
    isUnread: false,
  },
  {
    id: '2',
    user: {
      name: 'Nhiên Nguyệt',
      avatar: 'https://images.unsplash.com/photo-1581065178026-390bc4e78dad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMHdvbWFuJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc2OTYyMjU4N3ww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    lastMessage: 'Các bạn hiền đã được kết nối...',
    timestamp: '7 năm',
    isUnread: true,
  },
  {
    id: '3',
    user: {
      name: 'Tran Nga',
      avatar: 'https://images.unsplash.com/photo-1705830337569-47a1a24b0ad2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHdvbWFuJTIwaGVhZHNob3R8ZW58MXx8fHwxNzY5NjY3ODc2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    lastMessage: 'Bạn và Tran thấn với là bạn bè',
    timestamp: '7 năm',
    isUnread: false,
  },
  {
    id: '4',
    user: {
      name: 'Nguyễn Văn Minh',
      avatar: 'https://images.unsplash.com/photo-1554765345-6ad6a5417cde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBwb3J0cmFpdHxlbnwxfHx8fDE3Njk1Njg5MTJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    lastMessage: 'Cảm ơn bạn nhiều! 👍',
    timestamp: '2 giờ',
    isUnread: true,
  },
  {
    id: '5',
    user: {
      name: 'Mai Phương',
      avatar: 'https://images.unsplash.com/photo-1649589244330-09ca58e4fa64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc2OTU4OTUwM3ww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    lastMessage: 'Phương đã gửi một file đính kèm...',
    timestamp: '5 giờ',
    isUnread: false,
  },
  {
    id: '6',
    user: {
      name: 'Trần Đức Anh',
      avatar: 'https://images.unsplash.com/photo-1734864489622-0406baee014f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMG1hbiUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3Njk2MTc1OTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    lastMessage: 'Hẹn gặp lại bạn nhé!',
    timestamp: '1 ngày',
    isUnread: false,
  },
  {
    id: '7',
    user: {
      name: 'Ng Phi Yen Nhii',
      avatar: 'https://images.unsplash.com/photo-1581065178026-390bc4e78dad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc2lhbiUyMHdvbWFuJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc2OTYyMjU4N3ww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    lastMessage: 'Bạn và Yên Nhi đã là bạn...',
    timestamp: '2 ngày',
    isUnread: true,
  },
  {
    id: '8',
    user: {
      name: 'Lê Hoàng Nam',
      avatar: 'https://images.unsplash.com/photo-1622822923810-77dc32cff690?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMG1hbiUyMGhlYWRzaG90fGVufDF8fHx8MTc2OTY2Nzg3N3ww&ixlib=rb-4.1.0&q=80&w=1080',
    },
    lastMessage: 'Ok, tôi sẽ kiểm tra lại',
    timestamp: '3 ngày',
    isUnread: false,
  },
];

export const MessengerPanel = ({ onClose }: MessengerPanelProps) => {
  const [activeFilter, setActiveFilter] = useState<MessengerFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChatUser, setActiveChatUser] = useState<ChatUser | null>(null);
  const navigate = useNavigate();

  const filters: { key: MessengerFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'unread', label: 'Chưa đọc' },
    { key: 'groups', label: 'Nhóm' },
  ];

  const filteredConversations = mockConversations.filter((conv) => {
    if (activeFilter === 'unread' && !conv.isUnread) return false;
    if (activeFilter === 'groups' && !conv.isGroup) return false;
    if (searchQuery && !conv.user.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleConversationClick = (conversation: Conversation) => {
    setActiveChatUser({
      id: conversation.id,
      name: conversation.user.name,
      avatar: conversation.user.avatar,
      isOnline: Math.random() > 0.5, // Random online status for demo
    });
  };

  const handleCloseChatWindow = () => {
    setActiveChatUser(null);
    // Close the entire messenger panel when chat is closed
    onClose();
  };

  const handleMinimizeChatWindow = () => {
    setActiveChatUser(null);
    // Close the entire messenger panel when chat is minimized
    onClose();
  };

  return (
    <>
      {/* Overlay - Only show when chat is NOT active */}
      {!activeChatUser && (
        <div
          className="fixed inset-0 z-40"
          onClick={onClose}
        />
      )}

      {/* Panel - Hide when chat is active */}
      {!activeChatUser && (
        <div className="fixed top-14 right-4 w-[360px] bg-white rounded-lg shadow-2xl z-50 max-h-[calc(100vh-80px)] flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">Đoạn chat</h2>
              <div className="flex items-center gap-2">
                <button className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer">
                  <MoreHorizontal className="w-5 h-5 text-gray-600" />
                </button>
                <button 
                  onClick={() => {
                    navigate('/messages');
                    onClose();
                  }}
                  className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
                  title="Mở trong Messenger"
                >
                  <ExternalLink className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm trên Messenger"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm outline-none focus:bg-gray-200 transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mt-3">
              {filters.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    activeFilter === filter.key
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
              <button className="px-4 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer">
                ...
              </button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conversation) => (
                <ConversationItem key={conversation.id} conversation={conversation} onClick={() => handleConversationClick(conversation)} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                Không tìm thấy cuộc trò chuyện
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200">
            <button 
              onClick={() => {
                navigate('/messages');
                onClose();
              }}
              className="w-full text-center text-blue-600 hover:bg-gray-100 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              Xem tất cả trong Messenger
            </button>
          </div>
        </div>
      )}

      {/* Chat Window - Show when chat is active */}
      {activeChatUser && (
        <ChatWindow
          user={activeChatUser}
          onClose={handleCloseChatWindow}
          onMinimize={handleMinimizeChatWindow}
        />
      )}
    </>
  );
};