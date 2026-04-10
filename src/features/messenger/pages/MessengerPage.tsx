import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MoreHorizontal, Edit, RefreshCw } from 'lucide-react';
import { Header } from '../../home/components';
import { ConversationItem } from '../components';
import { ChatWindow } from '../components';
import { Conversation, MessengerFilter } from '../types/messenger.types';
import { ChatUser, Message, IncomingChatMessage } from '../types/message.types';
import { useChatSocket } from '../hooks/useChatSocket';
import { useFriendConversations } from '../hooks/useFriendConversations';
import { authService } from '@/services/authService';
import { chatService } from '@/services/chatService';

export default function MessengerPage() {
  const currentUser = authService.getCurrentUser();

  // ─── Conversation list ────────────────────────────────────────────────────
  const {
    conversations: baseConversations,
    loading: loadingConversations,
    error: friendsError,
    reload: loadFriends,
  } = useFriendConversations();

  // Real-time deltas: lastMessage, timestamp, isUnread — keyed by other user's ID
  const [overrides, setOverrides] = useState<Record<string, Partial<Conversation>>>({});

  const conversations: Conversation[] = baseConversations.map((c) => ({
    ...c,
    ...(overrides[c.user.id] ?? {}),
  }));

  // ─── Active conversation — persisted in URL (?with=<userId>) ─────────────
  // Surviving navigate-away/back without touching global state or localStorage.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeChatUserId = searchParams.get('with');

  // Derive the ChatUser object from the loaded conversations list.
  // While baseConversations is still loading this returns null, which is fine —
  // the loading skeleton will be shown.
  const activeChatUser = useMemo((): ChatUser | null => {
    if (!activeChatUserId) return null;
    const conv = baseConversations.find((c) => c.user.id === activeChatUserId);
    if (!conv) return null;
    return {
      id: conv.user.id,
      name: conv.user.name,
      avatar: conv.user.avatar,
      isOnline: false,
    };
  }, [activeChatUserId, baseConversations]);

  // ─── Messages — keyed by other user's ID ─────────────────────────────────
  const [messagesByUser, setMessagesByUser] = useState<Record<string, Message[]>>({});
  const [loadingMessages, setLoadingMessages] = useState(false);

  // THE CORE FIX: fetch messages declaratively whenever the selected user changes.
  // This runs on every mount (handles navigate-away/back) AND every conversation switch.
  // No cache guard — always fetch fresh so newly-received messages are included.
  useEffect(() => {
    if (!activeChatUserId || !currentUser?.id) return;

    let cancelled = false; // prevent setState on unmounted/stale effect

    setLoadingMessages(true);
    chatService
      .getChatHistory(currentUser.id, activeChatUserId)
      .then((history) => {
        if (cancelled) return;
        const myId = currentUser.id;
        const msgs: Message[] = history.map((m) => ({
          id: `${m.createdAt}-${m.senderId}`,
          senderId: m.senderId,
          text: m.content,
          timestamp: new Date(m.createdAt),
          isOwn: m.senderId === myId,
        }));
        setMessagesByUser((prev) => ({ ...prev, [activeChatUserId]: msgs }));

        // Sync the last-message preview in the sidebar
        if (msgs.length > 0) {
          const last = msgs[msgs.length - 1];
          setOverrides((prev) => ({
            ...prev,
            [activeChatUserId]: {
              ...(prev[activeChatUserId] ?? {}),
              lastMessage: last.text,
              timestamp: last.timestamp.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            },
          }));
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Leave existing messages in place; do not wipe them on error
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeChatUserId, currentUser?.id]); // re-runs on every conversation switch AND page remount

  // ─── WebSocket ────────────────────────────────────────────────────────────
  const handleIncomingMessage = useCallback(
    (msg: IncomingChatMessage) => {
      const myId = currentUser?.id;
      const otherUserId = msg.senderId === myId ? msg.receiverId : msg.senderId;

      const newMsg: Message = {
        id: `${Date.now()}-${Math.random()}`,
        senderId: msg.senderId,
        text: msg.content,
        timestamp: new Date(msg.createdAt),
        isOwn: msg.senderId === myId,
      };

      setMessagesByUser((prev) => ({
        ...prev,
        [otherUserId]: [...(prev[otherUserId] ?? []), newMsg],
      }));

      setOverrides((prev) => ({
        ...prev,
        [otherUserId]: {
          ...(prev[otherUserId] ?? {}),
          lastMessage: msg.content,
          timestamp: 'Vừa xong',
          isUnread: activeChatUserId !== otherUserId,
        },
      }));
    },
    [currentUser?.id, activeChatUserId],
  );

  const { connected, sendMessage } = useChatSocket(currentUser?.token, handleIncomingMessage);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleConversationClick = useCallback(
    (conversation: Conversation) => {
      const otherUserId = conversation.user.id;

      // Write selected user into URL — survives page refresh and back-navigation
      setSearchParams({ with: otherUserId });

      // Mark as read in the overrides map
      setOverrides((prev) => ({
        ...prev,
        [otherUserId]: { ...(prev[otherUserId] ?? {}), isUnread: false },
      }));
    },
    [setSearchParams],
  );

  const handleBackToList = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!activeChatUserId) return;
      sendMessage(activeChatUserId, content);
    },
    [activeChatUserId, sendMessage],
  );

  const handleReactMessage = useCallback(
    (messageId: string, emoji: string) => {
      if (!activeChatUserId) return;
      setMessagesByUser((prev) => {
        const msgs = prev[activeChatUserId] ?? [];
        return {
          ...prev,
          [activeChatUserId]: msgs.map((m) =>
            m.id === messageId ? { ...m, reactions: emoji === '' ? [] : [emoji] } : m,
          ),
        };
      });
    },
    [activeChatUserId],
  );

  // ─── Derived display state ────────────────────────────────────────────────
  const filters: { key: MessengerFilter; label: string }[] = [
    { key: 'all', label: 'Hộp thư' },
    { key: 'unread', label: 'Chưa đọc' },
  ];

  const [activeFilter, setActiveFilter] = useState<MessengerFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((conv) => {
    if (activeFilter === 'unread' && !conv.isUnread) return false;
    if (searchQuery && !conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    return true;
  });

  const activeMessages = activeChatUserId ? (messagesByUser[activeChatUserId] ?? []) : [];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-white overflow-hidden">
      <Header />

      <div className="flex h-[calc(100vh-56px)] mt-14 overflow-hidden">
        {/* ── Conversation List ── */}
        <div
          className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
            activeChatUser ? 'w-0 -translate-x-full' : 'w-[360px] translate-x-0'
          }`}
        >
          <div
            className={`w-[360px] flex flex-col h-full transition-opacity duration-300 ${
              activeChatUser ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            {/* Sidebar header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">Đoạn chat</h1>
                  <span
                    className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`}
                    title={connected ? 'Đã kết nối realtime' : 'Chưa kết nối'}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadFriends}
                    disabled={loadingConversations}
                    className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-50"
                    title="Tải lại danh sách"
                  >
                    <RefreshCw
                      className={`w-5 h-5 text-gray-600 ${loadingConversations ? 'animate-spin' : ''}`}
                    />
                  </button>
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
                  placeholder="Tìm kiếm bạn bè"
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

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto p-2">
              {loadingConversations ? (
                <div className="text-center py-8 text-gray-400 text-sm">Đang tải...</div>
              ) : friendsError ? (
                <div className="text-center py-8 text-sm">
                  <p className="text-red-500 mb-2">Không thể tải danh sách bạn bè</p>
                  <button onClick={loadFriends} className="text-blue-500 hover:underline text-sm">
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
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {activeChatUser ? (
            <ChatWindow
              user={activeChatUser}
              messages={activeMessages}
              loading={loadingMessages}
              connected={connected}
              onSendMessage={handleSendMessage}
              onReactMessage={handleReactMessage}
              onClose={handleBackToList}
              onMinimize={handleBackToList}
              fullScreen
            />
          ) : activeChatUserId && loadingConversations ? (
            // URL has a ?with= param but friends haven't loaded yet
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Đang tải...
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Edit className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Tin nhắn của bạn</h2>
                <p className="text-gray-500 text-sm">
                  Chọn một cuộc trò chuyện để bắt đầu nhắn tin
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
