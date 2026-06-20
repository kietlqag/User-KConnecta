import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, MoreHorizontal, Pin, PinOff, X } from 'lucide-react';

export interface PinnedChatMessage {
  id?: string | null;
  messageId: string;
  conversationKey: string;
  pinnedBy?: string | null;
  pinnedAt?: Date | null;
  senderId?: string | null;
  senderName: string;
  senderAvatar?: string | null;
  text: string;
  messageCreatedAt?: Date | null;
}

interface PinnedMessagesModalProps {
  open: boolean;
  items: PinnedChatMessage[];
  currentUserId?: string | null;
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
  onUnpinMessage: (messageId: string) => void;
}

function formatPinnedTime(date?: Date | null) {
  if (!date) return '';
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function PinnedMessagesModal({
  open,
  items,
  currentUserId,
  onClose,
  onJumpToMessage,
  onUnpinMessage,
}: PinnedMessagesModalProps) {
  const [openMenuMessageId, setOpenMenuMessageId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => (b.pinnedAt?.getTime() ?? 0) - (a.pinnedAt?.getTime() ?? 0)),
    [items],
  );

  useEffect(() => {
    if (!open) {
      setOpenMenuMessageId(null);
      setMenuPosition(null);
    }
  }, [open]);

  useEffect(() => {
    if (!openMenuMessageId) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpenMenuMessageId(null);
      setMenuPosition(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openMenuMessageId]);

  if (!open) return null;

  const openMenu = (messageId: string, button: HTMLButtonElement) => {
    const rect = button.getBoundingClientRect();
    const width = 196;
    const height = 92;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    const top = rect.bottom + height + 8 > window.innerHeight
      ? Math.max(8, rect.top - height - 8)
      : rect.bottom + 8;
    setOpenMenuMessageId((prev) => (prev === messageId ? null : messageId));
    setMenuPosition({ top, left });
  };

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/35 p-4" onMouseDown={onClose}>
      <div
        className="flex max-h-[82vh] w-full max-w-[520px] flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
              <Pin className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-[17px] font-semibold text-gray-900 dark:text-gray-100">Tin nhắn đã ghim</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{sortedItems.length} tin nhắn</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 dark:text-gray-400 hover:bg-muted cursor-pointer" title="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {sortedItems.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center px-6 text-center text-gray-500 dark:text-gray-400">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 text-gray-400">
                <Pin className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Chưa có tin nhắn ghim</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedItems.map((item) => {
                const senderLabel = item.senderId === currentUserId ? 'Bạn' : item.senderName;
                return (
                  <div key={item.messageId} className="flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <img
                      src={item.senderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderLabel)}&background=random`}
                      alt={senderLabel}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onJumpToMessage(item.messageId);
                      }}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                      title="Xem trong đoạn chat"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{senderLabel}</p>
                        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{formatPinnedTime(item.messageCreatedAt || item.pinnedAt)}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-gray-700 dark:text-gray-300 break-words">{item.text || 'Tin nhắn'}</p>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => openMenu(item.messageId, event.currentTarget)}
                      className="mt-0.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-500 hover:bg-muted hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-100"
                      title="Tùy chọn"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {openMenuMessageId && menuPosition && (
        <div
          ref={menuRef}
          className="fixed z-[240] min-w-[196px] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 shadow-xl"
          style={{ top: menuPosition.top, left: menuPosition.left, fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              const id = openMenuMessageId;
              setOpenMenuMessageId(null);
              onClose();
              onJumpToMessage(id);
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 dark:text-gray-200 hover:bg-muted"
          >
            <MessageSquare className="h-4 w-4" />
            Xem trong đoạn chat
          </button>
          <button
            type="button"
            onClick={() => {
              const id = openMenuMessageId;
              setOpenMenuMessageId(null);
              onUnpinMessage(id);
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 dark:text-gray-200 hover:bg-muted"
          >
            <PinOff className="h-4 w-4" />
            Bỏ ghim
          </button>
        </div>
      )}
    </div>
  );
}

