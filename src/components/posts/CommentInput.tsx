import { useState, useRef, KeyboardEvent } from 'react';
import { Smile, Sticker, Image, FileImage, Send } from 'lucide-react';

interface CommentInputProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
  userAvatar?: string;
}

export function CommentInput({
  onSubmit,
  placeholder = 'Bình luận dưới tên Quốc Kiệt',
  userAvatar = 'https://images.unsplash.com/photo-1724435811349-32d27f4d5806?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjBhdmF0YXIlMjBwcm9maWxlfGVufDF8fHx8MTc2OTYxOTc2NHww&ixlib=rb-4.1.0&q=80&w=400',
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content.trim());
      setContent('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-start gap-2">
      {/* User Avatar */}
      <img
        src={userAvatar}
        alt="Your avatar"
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1"
      />

      {/* Input Container */}
      <div className="flex-1 relative">
        <div
          className={`bg-gray-100 rounded-full flex items-center px-3 py-2 transition-all ${
            isFocused ? 'ring-1 ring-emerald-500' : ''
          }`}
        >
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-gray-500"
          />

          {/* Action Icons */}
          <div className="flex items-center gap-1 ml-2">
            <button
              type="button"
              className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
              title="Emoji"
            >
              <Smile className="w-5 h-5 text-gray-600" />
            </button>
            <button
              type="button"
              className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
              title="Sticker"
            >
              <Sticker className="w-5 h-5 text-gray-600" />
            </button>
            <button
              type="button"
              className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
              title="Ảnh"
            >
              <Image className="w-5 h-5 text-gray-600" />
            </button>
            <button
              type="button"
              className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
              title="GIF"
            >
              <FileImage className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Send Button (appears when typing) */}
        {content.trim() && (
          <button
            onClick={handleSubmit}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 hover:text-emerald-700 transition-colors"
            title="Gửi"
          >
            <Send className="w-5 h-5 fill-current" />
          </button>
        )}
      </div>
    </div>
  );
}