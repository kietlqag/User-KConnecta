import { useState } from 'react';
import { Search, MoreHorizontal, Edit } from 'lucide-react';
import { Header } from '../../home/components';
import { ConversationItem } from '../components';
import { ChatWindow } from '../components';
import { Conversation, MessengerFilter } from '../types/messenger.types';
import { ChatUser } from '../types/message.types';

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

export default function MessengerPage() {
  const [activeFilter, setActiveFilter] = useState<MessengerFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChatUser, setActiveChatUser] = useState<ChatUser | null>(null);

  const filters: { key: MessengerFilter; label: string }[] = [
    { key: 'all', label: 'Hộp thư' },
    { key: 'unread', label: 'Chưa đọc' },
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
      isOnline: Math.random() > 0.5,
    });
  };

  const handleBackToList = () => {
    setActiveChatUser(null);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="pt-14 flex h-[calc(100vh-56px)]">
        {/* Contact List Panel - Hide when chat is active */}
        <div
          className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
            activeChatUser
              ? 'w-0 -translate-x-full'
              : 'w-[360px] translate-x-0'
          }`}
        >
          <div className={`w-[360px] flex flex-col h-full transition-opacity duration-300 ${
            activeChatUser ? 'opacity-0' : 'opacity-100'
          }`}>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">Đoạn chat</h1>
                <div className="flex items-center gap-2">
                  <button className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                    <MoreHorizontal className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                    <Edit className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-4">
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
              <div className="flex items-center gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeFilter === filter.key
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    onClick={() => handleConversationClick(conversation)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Không tìm thấy cuộc trò chuyện
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Area - Expand to full width when active */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {activeChatUser ? (
            <ChatWindow
              user={activeChatUser}
              onClose={handleBackToList}
              onMinimize={handleBackToList}
              fullScreen
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Edit className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Tin nhắn của bạn</h2>
                <p className="text-gray-500 text-sm">
                  Gửi ảnh và tin nhắn riêng tư cho bạn bè
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}