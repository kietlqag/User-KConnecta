import { useState } from 'react';
import { Search, ExternalLink, RefreshCw } from 'lucide-react';
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

  const { conversations, loading, isRefreshing, error, reload } = useFriendConversations({ includeGroups: true });

  const filters: { key: MessengerFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'unread', label: 'Chưa đọc' },
    { key: 'strangers', label: 'Người lạ' },
  ];

  const filteredConversations = conversations.filter((conv) => {
    if (activeFilter === 'unread' && !conv.isUnread) return false;
    if (activeFilter === 'strangers' && !conv.isStranger) return false;
    if (activeFilter === 'all' && conv.isStranger) return false;
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

      <div className="fixed top-14 right-4 z-50 flex h-[min(620px,calc(100vh-80px))] w-[360px] flex-col overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="shrink-0 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Đoạn chat</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={reload}
                disabled={isRefreshing}
                className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                title="Tải lại"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => {
                  navigate('/messages');
                  onClose();
                }} className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
                title="Mở trong Messenger"
              >
                <ExternalLink className="w-5 h-5 text-gray-600 dark:text-gray-400" />
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
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-900 text-foreground placeholder:text-muted-foreground rounded-full text-sm outline-none focus:bg-gray-200 dark:focus:bg-gray-700 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 mt-3">
            {filters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                  activeFilter === filter.key
                    ? filter.key === 'strangers'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-600'
                    : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading && conversations.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Đang tải...</div>
          ) : error ? (
            <div className="text-center py-8 text-sm">
              <p className="text-red-500 mb-2">Không thể tải danh sách</p>
              <button onClick={reload} className="text-emerald-500 hover:underline text-sm cursor-pointer">
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
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              {activeFilter === 'strangers'
                ? 'Chưa có tin nhắn từ người lạ.'
                : conversations.length === 0
                  ? 'Chưa có đoạn chat nào.'
                  : 'Không tìm thấy cuộc trò chuyện'}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-3">
          <button
            onClick={() => {
              navigate('/messages');
              onClose();
            }} className="w-full text-center text-emerald-600 hover:bg-muted py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Xem tất cả trong Messenger
          </button>
        </div>
      </div>
    </>
  );
};


