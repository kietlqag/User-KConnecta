import { useState, useEffect, useRef } from 'react';
import { Smile, Reply, MoreVertical } from 'lucide-react';
import { Message } from '../../types/message.types';

interface MessageBubbleProps {
  message: Message;
  onReact?: (messageId: string, emoji: string) => void;
}

const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const MessageBubble = ({ message, onReact }: MessageBubbleProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const reactionRef = useRef<HTMLDivElement>(null);

  // Click outside to close menu and reactions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (reactionRef.current && !reactionRef.current.contains(event.target as Node)) {
        setShowReactions(false);
      }
    };

    if (showMenu || showReactions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, showReactions]);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleReaction = (emoji: string) => {
    // Chỉ giữ 1 reaction duy nhất - nếu click lại reaction đang có thì xóa, nếu click reaction khác thì thay thế
    if (message.reactions && message.reactions.length === 1 && message.reactions[0] === emoji) {
      // Nếu click lại reaction đang có thì xóa hết
      onReact?.(message.id, '');
    } else {
      // Nếu click reaction khác thì thay thế
      onReact?.(message.id, emoji);
    }
    setShowReactions(false);
  };

  const handleMouseLeave = () => {
    setShowTimestamp(false);
    setIsHovering(false);
  };

  return (
    <div
      className={`flex items-end gap-2 ${message.reactions && message.reactions.length > 0 ? 'mb-3' : 'mb-1'} ${message.isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => {
        setShowTimestamp(true);
        setIsHovering(true);
      }}
      onMouseLeave={handleMouseLeave}
    >
      {/* Message Bubble */}
      <div className="relative group max-w-[70%]">
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
            className={`absolute -bottom-2 bg-white rounded-full px-1.5 py-0.5 shadow-md border border-gray-200 flex items-center gap-0.5 z-[1] ${
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

        {/* Action Toolbar - Shows on hover - Absolute positioned based on message owner */}
        {isHovering && (
          <div
            className={`absolute top-1 flex items-center gap-1 bg-white rounded-full shadow-sm px-1 py-1 z-[2] ${
              message.isOwn ? 'right-full mr-2' : 'left-full ml-2'
            }`}
          >
            {/* Emoji Button */}
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Thả cảm xúc"
            >
              <Smile className="w-4 h-4 text-gray-600" />
            </button>

            {/* Reply Button */}
            <button
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Trả lời"
            >
              <Reply className="w-4 h-4 text-gray-600" />
            </button>

            {/* More Options Button */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer relative"
              title="Tùy chọn khác"
            >
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        )}

        {/* Reaction Picker */}
        {showReactions && (
          <div
            className={`absolute bottom-full mb-2 bg-white rounded-full shadow-xl border border-gray-200 px-3 py-2 flex items-center gap-2 z-10 ${
              message.isOwn ? 'right-0' : 'left-0'
            }`}
            ref={reactionRef}
          >
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="text-2xl hover:scale-150 transition-transform duration-200 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              title="Thêm emoji khác"
            >
              <span className="text-xl text-gray-600">+</span>
            </button>
          </div>
        )}

        {/* More Options Menu */}
        {showMenu && (
          <div
            className={`absolute bottom-full mb-2 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] z-10 ${
              message.isOwn ? 'right-0' : 'left-0'
            }`}
            ref={menuRef}
          >
            <button
              onClick={() => setShowMenu(false)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Gỡ
            </button>
            <button
              onClick={() => setShowMenu(false)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Chuyển tiếp
            </button>
            <button
              onClick={() => setShowMenu(false)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Báo cáo
            </button>
          </div>
        )}
      </div>

      {/* Timestamp - aligned to bottom */}
      {showTimestamp && (
        <span className="text-xs text-gray-500 self-end pb-0.5">{formatTime(message.timestamp)}</span>
      )}
    </div>
  );
};