import { useState } from 'react';
import { Search, MoreHorizontal, ExternalLink, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConversationItem } from '../ConversationItem';
import { Conversation, MessengerFilter } from '../../types/messenger.types';
import { useFriendConversations } from '../../hooks/useFriendConversations';

interface MessengerPanelProps {
  onClose: () => void;
}

export const MessengerPanel = ({ onClose }: MessengerPanelProps) => {
  const [activeFilter, setActiveFilter] = useState<MessengerFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const { conversations, loading, error, reload } = useFriendConversations();

  const filters: { key: MessengerFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'unread', label: 'Chưa đọc' },
  ];

  const filteredConversations = conversations.filter((conv) => {
    if (activeFilter === 'unread' && !conv.isUnread) return false;
    if (searchQuery && !conv.user.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleConversationClick = (conversation: Conversation) => {
    navigate(`/messages?with=${conversation.user.id}`);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="fixed top-14 right-4 w-[360px] bg-white rounded-lg shadow-2xl z-50 max-h-[calc(100vh-80px)] flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Đoạn chat</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={reload}
                disabled={loading}
                className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                title="Tải lại"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
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
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Đang tải...</div>
          ) : error ? (
            <div className="text-center py-8 text-sm">
              <p className="text-red-500 mb-2">Không thể tải danh sách</p>
              <button onClick={reload} className="text-blue-500 hover:underline text-sm">
                Thử lại
              </button>
            </div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                onClick={() => handleConversationClick(conversation)}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              {conversations.length === 0
                ? 'Chưa có bạn bè nào. Kết bạn để bắt đầu chat!'
                : 'Không tìm thấy cuộc trò chuyện'}
            </div>
          )}
        </div>

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
    </>
  );
};

