import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Pin, PinOff } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Conversation } from '../../types/messenger.types';

interface ConversationItemProps {
  conversation: Conversation;
  onClick?: () => void;
  isPinned?: boolean;
  onTogglePin?: (conversationUserId: string) => void;
}

export const ConversationItem = ({ conversation, onClick, isPinned = false, onTogglePin }: ConversationItemProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className="w-full min-w-0 overflow-hidden px-2 py-2 pr-10 flex items-center gap-3 hover:bg-muted rounded-lg transition-colors cursor-pointer"
      >
        <div className="relative flex-shrink-0">
          <UserAvatar
            name={conversation.user.name}
            avatarUrl={conversation.user.avatar}
            userId={conversation.user.id}
            variant={conversation.isGroup ? 'group' : 'user'}
            rounded="full"
            className="w-14 h-14"
          />
          {conversation.user.isOnline && (
            <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          )}
          {conversation.isUnread && (
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
          )}
        </div>

        <div className="flex-1 min-w-0 text-left">
          <div className="flex min-w-0 items-center justify-between mb-1">
            <h4 className={`text-sm truncate ${conversation.isUnread ? 'font-semibold' : 'font-normal'}`}>
              {conversation.user.name}
            </h4>
            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{conversation.timestamp}</span>
          </div>
          <p className={`text-sm truncate ${conversation.isUnread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
            {conversation.lastMessage}
          </p>
        </div>

        {conversation.isUnread && (
          <div className="flex-shrink-0 w-3 h-3 bg-emerald-500 rounded-full" />
        )}
      </button>

      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu((prev) => !prev);
          }} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
          title="Tùy chọn đoạn chat"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-2 top-10 z-20 min-w-[150px] overflow-hidden rounded-lg border border-border bg-card py-1 shadow-xl"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin?.(conversation.user.id);
              setShowMenu(false);
            }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
          >
            {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            {isPinned ? 'Bỏ ghim' : 'Ghim'}
          </button>
        </div>
      )}
    </div>
  );
};
