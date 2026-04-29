import React, { ForwardedRef, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { Message, ChatUser } from '../../../types/message.types';
import { MessageBubble } from '../../MessageBubble';

interface MessageListProps {
  messages: Message[];
  loadingOlder: boolean;
  hasOlder: boolean;
  highlightedMessageId: string | null;
  showJumpToLatest: boolean;
  scrollToBottom: () => void;
  onJumpToMessage: (id: string) => void;
  onReactMessage?: (id: string, emoji: string) => void;
  onDeleteMessage?: (id: string) => void;
  onReplyMessage: (msg: Message) => void;
  onForwardMessage: (msg: Message) => void;
  onReportMessage: (msg: Message) => void;
  onScroll: () => void;
}

export const MessageList = forwardRef(({
  messages,
  loadingOlder,
  hasOlder,
  highlightedMessageId,
  showJumpToLatest,
  scrollToBottom,
  onJumpToMessage,
  onReactMessage,
  onDeleteMessage,
  onReplyMessage,
  onForwardMessage,
  onReportMessage,
  onScroll,
}: MessageListProps, ref: ForwardedRef<HTMLDivElement>) => {
  const shouldShowSenderAvatar = (index: number) => {
    const current = messages[index];
    if (!current || current.isOwn) return false;
    const next = messages[index + 1];
    if (!next) return true;
    return next.isOwn || next.senderId !== current.senderId;
  };

  const lastOwnMessageId = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].isOwn) return messages[i].id;
    }
    return null;
  })();

  const latestOwnMessageStatus = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (!message.isOwn || message.systemType) continue;
      if (message.deliveryStatus === 'SEEN') return 'Đã xem';
      if (message.deliveryStatus === 'DELIVERED') return 'Đã nhận';
      return 'Đã gửi';
    }
    return 'Đã gửi';
  })();

  return (
    <div className="flex-1 relative min-h-0 bg-white">
      <div
        ref={ref}
        onScroll={onScroll}
        className="h-full overflow-y-auto px-4 py-4 space-y-1 scroll-smooth"
      >
        {hasOlder && (
          <div className="flex justify-center py-2">
            <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {loadingOlder ? 'Đang tải tin nhắn cũ...' : 'Kéo lên để xem tin nhắn cũ'}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={message.id} id={`chat-message-${message.id}`}>
            <MessageBubble
              message={message}
              showSenderAvatar={shouldShowSenderAvatar(index)}
              isHighlighted={highlightedMessageId === message.id}
              deliveryStatusLabel={message.id === lastOwnMessageId ? latestOwnMessageStatus : undefined}
              onReact={onReactMessage}
              onReply={onReplyMessage}
              onDelete={onDeleteMessage}
              onForward={onForwardMessage}
              onReport={onReportMessage}
              onJumpToMessage={onJumpToMessage}
            />
          </div>
        ))}
      </div>

      {showJumpToLatest && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-4 right-4 p-2 bg-white rounded-full shadow-lg border border-gray-200 text-blue-600 hover:bg-gray-50 transition-all animate-bounce"
          title="Cuộn xuống dưới cùng"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}
    </div>
  );
});

MessageList.displayName = 'MessageList';
