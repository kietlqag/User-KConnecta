import { useState, useRef, useEffect } from 'react';
import { Phone, Video, Minus, X, Smile, Image as ImageIcon, Mic, Sticker, FileImage, Send, ArrowLeft, Info } from 'lucide-react';
import { ChatUser, Message } from '../../types/message.types';
import { MessageBubble } from '../MessageBubble';

interface ChatWindowProps {
  user: ChatUser;
  onClose: () => void;
  onMinimize?: () => void;
  fullScreen?: boolean;
}

const mockMessages: Message[] = [
  {
    id: '1',
    senderId: 'other',
    text: 'Bạn chỉ cần tải vpn về và chuyển sang turkey',
    timestamp: new Date(Date.now() - 7200000),
    isOwn: false,
  },
  {
    id: '2',
    senderId: 'other',
    text: 'Sau đấy là nhập key 1 phát ăn ngay nha 😍😍😍',
    timestamp: new Date(Date.now() - 7100000),
    isOwn: false,
  },
  {
    id: '3',
    senderId: 'me',
    text: 'oke đã thành công shop uy tín quá 😘',
    timestamp: new Date(Date.now() - 3600000),
    isOwn: true,
  },
  {
    id: '4',
    senderId: 'other',
    text: 'Hi',
    timestamp: new Date(Date.now() - 600000),
    isOwn: false,
  },
  {
    id: '5',
    senderId: 'other',
    text: 'Cảm ơn bạn nhé!',
    timestamp: new Date(Date.now() - 400000),
    isOwn: false,
  },
  {
    id: '6',
    senderId: 'other',
    text: 'Chúc bạn buổi tối vui vẻ.',
    timestamp: new Date(Date.now() - 300000),
    isOwn: false,
  },
];

export const ChatWindow = ({ user, onClose, onMinimize, fullScreen }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: 'me',
        text: inputText,
        timestamp: new Date(),
        isOwn: true,
      };
      setMessages([...messages, newMessage]);
      setInputText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReact = (messageId: string, emoji: string) => {
    setMessages(messages.map(msg => {
      if (msg.id === messageId) {
        // Nếu emoji rỗng (từ MessageBubble khi click lại reaction đang có) thì xóa hết reactions
        if (emoji === '') {
          return {
            ...msg,
            reactions: [],
          };
        }
        // Nếu có emoji mới thì thay thế toàn bộ reactions bằng emoji mới (chỉ giữ 1 reaction)
        return {
          ...msg,
          reactions: [emoji],
        };
      }
      return msg;
    }));
  };

  return (
    <div className={`${fullScreen ? 'w-full h-full flex flex-col' : 'fixed bottom-0 right-6 w-[360px] h-[520px] rounded-t-xl shadow-2xl animate-in slide-in-from-bottom-4'} bg-white flex flex-col z-50`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          {fullScreen && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2 cursor-pointer"
              title="Quay lại danh sách chat"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}
          <div className="relative">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            {user.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{user.name}</h3>
            <p className="text-xs text-gray-500">
              {user.isOnline ? 'Đang hoạt động' : 'Không hoạt động'}
            </p>
          </div>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" title="Gọi thoại">
            <Phone className="w-4 h-4 text-blue-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" title="Gọi video">
            <Video className="w-4 h-4 text-blue-600" />
          </button>
          {fullScreen && (
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" title="Thông tin cuộc trò chuyện">
              <Info className="w-4 h-4 text-blue-600" />
            </button>
          )}
          {!fullScreen && onMinimize && (
            <button
              onClick={onMinimize}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Thu nhỏ"
            >
              <Minus className="w-4 h-4 text-blue-600" />
            </button>
          )}
          {!fullScreen && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4 text-blue-600" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto px-4 py-3 space-y-1 ${fullScreen ? 'max-w-3xl mx-auto w-full' : ''}`}>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onReact={handleReact}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`px-3 py-3 border-t border-gray-200 bg-white ${fullScreen ? 'max-w-3xl mx-auto w-full' : ''}`}>
        <div className="flex items-center gap-2">
          {/* Left Action Icons */}
          <div className="flex items-center gap-1">
            <button
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Gửi tin nhắn thoại"
            >
              <Mic className="w-5 h-5 text-blue-600" />
            </button>
            <button
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Đính kèm ảnh"
            >
              <ImageIcon className="w-5 h-5 text-blue-600" />
            </button>
            <button
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Chọn sticker"
            >
              <Sticker className="w-5 h-5 text-blue-600" />
            </button>
            <button
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Chọn GIF"
            >
              <FileImage className="w-5 h-5 text-blue-600" />
            </button>
          </div>

          {/* Input Field */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Aa"
              className="w-full px-3 py-2 pr-11 bg-gray-100 rounded-full outline-none focus:bg-gray-200 transition-colors text-sm"
            />
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 hover:bg-gray-200 rounded-full transition-colors absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
              title="Chọn emoji"
            >
              <Smile className="w-5 h-5 text-blue-600" />
            </button>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className={`p-2 rounded-full transition-all ${
              inputText.trim()
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'text-blue-400 cursor-not-allowed'
            }`}
            title="Gửi"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Emoji Picker (Simple) */}
        {showEmojiPicker && (
          <div className="absolute bottom-full right-4 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 grid grid-cols-8 gap-2 z-10">
            {['😀', '😂', '😍', '🥰', '😊', '😎', '🤔', '😢', '😭', '😡', '👍', '❤️', '🔥', '✨', '🎉', '👏'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setInputText(inputText + emoji);
                  setShowEmojiPicker(false);
                }}
                className="text-2xl hover:scale-125 transition-transform cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};