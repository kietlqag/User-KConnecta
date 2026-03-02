import { useState } from 'react';
import { Smile } from 'lucide-react';
import { Message } from '../../types/message.types';

interface MessageBubbleProps {
  message: Message;
  onReact?: (messageId: string, emoji: string) => void;
}

const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const MessageBubble = ({ message, onReact }: MessageBubbleProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(false);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div
      className={`flex items-end gap-2 mb-1 ${message.isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      {/* Message Bubble */}
      <div
        className="relative group max-w-[70%]"
        onMouseEnter={() => setShowReactions(true)}
        onMouseLeave={() => setShowReactions(false)}
      >
        <div
          className={`px-3 py-2 rounded-2xl break-words ${
            message.isOwn
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-900'
          }`}
        >
          <p className="text-sm leading-relaxed">{message.text}</p>
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div
            className={`absolute -bottom-2 bg-white rounded-full px-1.5 py-0.5 shadow-md border border-gray-200 flex items-center gap-0.5 ${
              message.isOwn ? 'left-2' : 'right-2'
            }`}
          >
            {message.reactions.map((emoji, index) => (
              <span key={index} className="text-xs">
                {emoji}
              </span>
            ))}
          </div>
        )}

        {/* Reaction Picker */}
        {showReactions && (
          <div
            className={`absolute bottom-full mb-2 bg-white rounded-full shadow-xl border border-gray-200 px-2 py-1.5 flex items-center gap-1 ${
              message.isOwn ? 'right-0' : 'left-0'
            }`}
          >
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReact?.(message.id, emoji)}
                className="text-lg hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timestamp */}
      {showTimestamp && (
        <span className="text-xs text-gray-500 mb-1">{formatTime(message.timestamp)}</span>
      )}
    </div>
  );
};