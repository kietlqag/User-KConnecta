import React, { ForwardedRef, forwardRef } from 'react';
import { ChevronDown, Pencil, UserRoundPlus } from 'lucide-react';
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
  onPinMessage?: (msg: Message) => void;
  pinnedMessageId?: string | null;
  onReportMessage: (msg: Message) => void;
  onScroll: () => void;
  isGroupChat?: boolean;
  groupName?: string;
  groupAvatar?: string;
  isGroupCreator?: boolean;
  groupCreatorName?: string;
  groupMembers?: ChatUser[];
  peerAvatar?: string;
  peerName?: string;
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
  onPinMessage,
  pinnedMessageId = null,
  onReportMessage,
  onScroll,
  isGroupChat = false,
  groupName = '',
  groupAvatar = '',
  isGroupCreator = false,
  groupCreatorName = 'Người tạo',
  groupMembers = [],
  peerAvatar = '',
  peerName = 'Người dùng',
}: MessageListProps, ref: ForwardedRef<HTMLDivElement>) => {
  const senderById = new Map(groupMembers.map((member) => [member.id, member]));
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
    <div className="flex-1 relative min-h-0 min-w-0 overflow-hidden bg-white">
      <div
        ref={ref}
        onScroll={onScroll}
        className="h-full overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1 scroll-smooth sm:px-4"
      >
        {hasOlder && (
          <div className="flex justify-center py-2">
            <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {loadingOlder ? 'Đang tải tin nhắn cũ...' : 'Kéo lên để xem tin nhắn cũ'}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={message.id} id={`chat-message-${message.id}`} className="min-w-0">
            <MessageBubble
              message={message}
              showSenderAvatar={shouldShowSenderAvatar(index)}
              senderAvatar={senderById.get(message.senderId)?.avatar || peerAvatar}
              senderName={senderById.get(message.senderId)?.name || peerName}
              isHighlighted={highlightedMessageId === message.id}
              showDeliveryStatus={message.id === lastOwnMessageId}
              deliveryStatusLabel={message.id === lastOwnMessageId ? latestOwnMessageStatus : undefined}
              onReact={onReactMessage}
              onReply={onReplyMessage}
              onDelete={onDeleteMessage}
              onForward={onForwardMessage}
              onPinMessage={onPinMessage}
              isPinnedMessage={pinnedMessageId === message.id}
              onReport={onReportMessage}
              onJumpToMessage={onJumpToMessage}
            />
          </div>
        ))}

        {messages.length === 0 && isGroupChat && (
          <div className="flex min-h-[54vh] flex-col items-center justify-center px-6 py-8 text-center">
            <img
              src={groupAvatar || `https://ui-avatars.com/api/?background=2563eb&color=ffffff&bold=true&name=Group`}
              alt={groupName || 'Nhóm chat'}
              className="h-14 w-14 rounded-full object-cover"
            />
            <h3 className="mt-3 text-2xl font-semibold leading-tight text-gray-900">{groupName || 'Nhóm chat'}</h3>
            <p className="mt-1.5 text-base text-gray-500">
              {isGroupCreator ? 'Bạn đã tạo nhóm này' : `${groupCreatorName} đã tạo nhóm này`}
            </p>
            <div className="mt-6 flex items-center gap-7">
              <button type="button" className="flex flex-col items-center gap-1.5 text-gray-700" title="Thêm thành viên">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
                  <UserRoundPlus className="h-5.5 w-5.5" />
                </span>
                <span className="text-[14px]">Thêm</span>
              </button>
              <button type="button" className="flex flex-col items-center gap-1.5 text-gray-700" title="Đổi tên nhóm">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
                  <Pencil className="h-5 w-5" />
                </span>
                <span className="text-[14px]">Tên</span>
              </button>
            </div>
            <p className="mt-7 text-[15px] text-gray-500">
              {isGroupCreator
                ? `Bạn đã đặt tên nhóm là ${groupName || 'Nhóm chat'}.`
                : `${groupCreatorName} đã đặt tên nhóm là ${groupName || 'Nhóm chat'}.`}
            </p>
          </div>
        )}
      </div>

      {showJumpToLatest && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-20 right-4 z-20 p-2 bg-white rounded-full shadow-lg border border-gray-200 text-blue-600 hover:bg-gray-50 transition-all animate-bounce"
          title="Cuộn xuống dưới cùng"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}
    </div>
  );
});

MessageList.displayName = 'MessageList';
