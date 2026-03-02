import { Conversation } from '../../types/messenger.types';

interface ConversationItemProps {
  conversation: Conversation;
  onClick?: () => void;
}

export const ConversationItem = ({ conversation, onClick }: ConversationItemProps) => {
  return (
    <button 
      onClick={onClick}
      className="w-full px-2 py-2 flex items-center gap-3 hover:bg-gray-100 rounded-lg transition-colors"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <img
          src={conversation.user.avatar}
          alt={conversation.user.name}
          className="w-14 h-14 rounded-full object-cover"
        />
        {conversation.isUnread && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 border-2 border-white rounded-full" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-1">
          <h4 className={`text-sm truncate ${conversation.isUnread ? 'font-semibold' : 'font-normal'}`}>
            {conversation.user.name}
          </h4>
          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{conversation.timestamp}</span>
        </div>
        <p className={`text-sm truncate ${conversation.isUnread ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
          {conversation.lastMessage}
        </p>
      </div>

      {/* Unread Badge */}
      {conversation.isUnread && (
        <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full" />
      )}
    </button>
  );
};