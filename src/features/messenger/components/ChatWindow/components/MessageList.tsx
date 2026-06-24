import React, { ForwardedRef, forwardRef } from 'react';
import { ChevronDown, Pencil, UserRoundPlus } from 'lucide-react';
import { Message, ChatUser } from '../../../types/message.types';
import { UserAvatar } from '@/components/shared/UserAvatar';
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
  onDeleteMessageForMe?: (id: string) => void;
  onDeleteMessageForEveryone?: (id: string) => void;
  onReplyMessage: (msg: Message) => void;
  onForwardMessage: (msg: Message) => void;
  onPinMessage?: (msg: Message) => void;
  pinnedMessageIds?: string[];
  onReportMessage: (msg: Message) => void;
  onScroll: () => void;
  onUserScrollIntent: () => void;
  isGroupChat?: boolean;
  groupName?: string;
  groupAvatar?: string;
  isGroupCreator?: boolean;
  groupCreatorName?: string;
  groupMembers?: ChatUser[];
  peerAvatar?: string;
  peerName?: string;
  themeColor?: string | null;
  onGroupJoinLinkClick?: (token: string) => void;
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
  onDeleteMessageForMe,
  onDeleteMessageForEveryone,
  onReplyMessage,
  onForwardMessage,
  onPinMessage,
  pinnedMessageIds = [],
  onReportMessage,
  onScroll,
  onUserScrollIntent,
  isGroupChat = false,
  groupName = '',
  groupAvatar = '',
  isGroupCreator = false,
  groupCreatorName = 'Người tạo',
  groupMembers = [],
  peerAvatar = '',
  peerName = 'Người dùng',
  themeColor,
  onGroupJoinLinkClick,
}: MessageListProps, ref: ForwardedRef<HTMLDivElement>) => {
  const senderById = new Map(groupMembers.map((member) => [member.id, member]));
  const pinnedMessageIdSet = new Set(pinnedMessageIds);
  const shouldShowSenderAvatar = (index: number) => {
    const current = messages[index];
    if (!current || current.isOwn) return false;
    const next = messages[index + 1];
    if (!next) return true;
    return next.isOwn || next.senderId !== current.senderId;
  };

  const isGroupedWithPrevious = (index: number) => {
    const current = messages[index];
    const previous = messages[index - 1];
    if (!current || !previous) return false;
    if (current.systemType || previous.systemType) return false;
    return current.senderId === previous.senderId;
  };

  const isGroupedWithNext = (index: number) => {
    const current = messages[index];
    const next = messages[index + 1];
    if (!current || !next) return false;
    if (current.systemType || next.systemType) return false;
    return current.senderId === next.senderId;
  };

  const lastOwnMessageId = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].isOwn && !messages[i].systemType) return messages[i].id;
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

  const formatChatAction = (message: Message) => {
    const actor = message.isOwn ? 'Bạn' : message.systemActionActorName || senderById.get(message.senderId)?.name || peerName || 'Người dùng';
    const target = message.systemActionTargetName || 'một thành viên';
    const value = message.systemActionValue;

    switch (message.systemActionType) {
      case 'rename_conversation':
        return `${actor} đã đổi tên đoạn chat${value ? ` thành ${value}` : ''}.`;
      case 'change_group_photo':
        return `${actor} đã đổi ảnh nhóm.`;
      case 'change_theme':
        return `${actor} đã đổi chủ đề đoạn chat.`;
      case 'change_nickname':
        return `${actor} đã đặt biệt danh cho ${target}${value ? ` là ${value}` : ''}.`;
      case 'clear_nickname':
        return `${actor} đã gỡ biệt danh của ${target}.`;
      case 'add_members':
        return `${actor} đã thêm ${value || 'người mới'} vào nhóm.`;
      case 'add_members_pending':
        return `${actor} đã mời ${value || 'người mới'} — đang chờ phê duyệt.`;
      case 'approve_member':
        return `${actor} đã phê duyệt ${target} tham gia nhóm.`;
      case 'reject_member':
        return `${actor} đã từ chối ${target} tham gia nhóm.`;
      case 'remove_member':
        return `${actor} đã xóa ${target} khỏi nhóm.`;
      case 'leave_group':
        return `${actor} đã rời khỏi nhóm.`;
      case 'transfer_admin':
        return `${actor} đã chuyển quyền quản trị cho ${target}.`;
      case 'join_via_link':
        return `${actor} đã tham gia nhóm qua liên kết.`;
      case 'join_via_link_pending':
        return `${actor} đã yêu cầu tham gia qua liên kết — đang chờ phê duyệt.`;
      case 'pin_message':
        return `${actor} đã ghim một tin nhắn.`;
      case 'unpin_message':
        return `${actor} đã bỏ ghim một tin nhắn.`;
      default:
        return message.text;
    }
  };

  return (
    <div className="flex-1 relative min-h-0 min-w-0 overflow-hidden bg-white dark:bg-gray-800">
      <div
        ref={ref}
        onScroll={onScroll}
        onWheel={onUserScrollIntent}
        onTouchStart={onUserScrollIntent}
        onPointerDown={onUserScrollIntent}
        className="h-full overflow-y-auto overflow-x-hidden px-3 py-4 scroll-smooth sm:px-4"
      >
        {hasOlder && (
          <div className="flex justify-center py-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded-full">
              {loadingOlder ? 'Đang tải tin nhắn cũ...' : 'Kéo lên để xem tin nhắn cũ'}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={message.id}
            id={`chat-message-${message.id}`}
            className="min-w-0"
          >
            {message.systemType === 'chat_action' ? (
              <div className="flex justify-center px-4 py-2 text-center text-[13px] leading-5 text-gray-500 dark:text-gray-400">
                <span>
                  {formatChatAction(message)}
                  {message.systemActionType === 'pin_message' && (
                    <>
                      {' '}
                      <span className="font-semibold text-emerald-600">Xem tất cả</span>
                    </>
                  )}
                </span>
              </div>
            ) : (
              <MessageBubble
                message={message}
                groupWithPrevious={isGroupedWithPrevious(index)}
                groupWithNext={isGroupedWithNext(index)}
                showSenderAvatar={shouldShowSenderAvatar(index)}
                senderAvatar={senderById.get(message.senderId)?.avatar || peerAvatar}
                senderName={senderById.get(message.senderId)?.name || peerName}
                isHighlighted={highlightedMessageId === message.id}
                showDeliveryStatus={message.id === lastOwnMessageId}
                deliveryStatusLabel={message.id === lastOwnMessageId ? latestOwnMessageStatus : undefined}
                onReact={onReactMessage}
                onReply={onReplyMessage}
                onDeleteForMe={onDeleteMessageForMe}
                onDeleteForEveryone={onDeleteMessageForEveryone}
                onForward={onForwardMessage}
                onPinMessage={onPinMessage}
                isPinnedMessage={pinnedMessageIdSet.has(message.id)}
                onReport={onReportMessage}
                onJumpToMessage={onJumpToMessage}
                themeColor={themeColor}
                onGroupJoinLinkClick={onGroupJoinLinkClick}
              />
            )}
          </div>
        ))}

        {messages.length === 0 && isGroupChat && (
          <div className="flex min-h-[54vh] flex-col items-center justify-center px-6 py-8 text-center">
            <UserAvatar
              name={groupName || 'Nhóm chat'}
              avatarUrl={groupAvatar}
              variant="group"
              rounded="full"
              className="h-14 w-14"
            />
            <h3 className="mt-3 text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-100">{groupName || 'Nhóm chat'}</h3>
            <p className="mt-1.5 text-base text-gray-500 dark:text-gray-400">
              {isGroupCreator ? 'Bạn đã tạo nhóm này' : `${groupCreatorName} đã tạo nhóm này`}
            </p>
            <div className="mt-6 flex items-center gap-7">
              <button type="button" className="flex flex-col items-center gap-1.5 text-gray-700 dark:text-gray-300 cursor-pointer" title="Thêm thành viên">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                  <UserRoundPlus className="h-5.5 w-5.5" />
                </span>
                <span className="text-[14px]">Thêm</span>
              </button>
              <button type="button" className="flex flex-col items-center gap-1.5 text-gray-700 dark:text-gray-300 cursor-pointer" title="Đổi tên nhóm">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                  <Pencil className="h-5 w-5" />
                </span>
                <span className="text-[14px]">Tên</span>
              </button>
            </div>
            <p className="mt-7 text-[15px] text-gray-500 dark:text-gray-400">
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
          className="absolute bottom-20 right-4 z-20 cursor-pointer rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-emerald-600 shadow-lg transition-all hover:bg-gray-50 dark:hover:bg-gray-800 animate-bounce"
          title="Cuộn xuống dưới cùng"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}
    </div>
  );
});

MessageList.displayName = 'MessageList';

