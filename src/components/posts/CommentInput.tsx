import { useState, useRef, KeyboardEvent } from 'react';
import { Smile, Sticker, Image, FileImage, Send } from 'lucide-react';

interface CommentInputProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
  userAvatar?: string;
}

export function CommentInput({
  onSubmit,
  placeholder = 'Bình luận...',
  userAvatar = 'https://ui-avatars.com/api/?background=random&name=User',
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
      <img
        src={userAvatar}
        alt="Your avatar"
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1"
      />

      <div className="flex-1">
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

          <div className="ml-2 flex items-center gap-1">
            <button type="button" className="p-1.5 hover:bg-gray-200 rounded-full transition-colors" title="Emoji">
              <Smile className="w-5 h-5 text-gray-600" />
            </button>
            <button type="button" className="p-1.5 hover:bg-gray-200 rounded-full transition-colors" title="Sticker">
              <Sticker className="w-5 h-5 text-gray-600" />
            </button>
            <button type="button" className="p-1.5 hover:bg-gray-200 rounded-full transition-colors" title="Ảnh">
              <Image className="w-5 h-5 text-gray-600" />
            </button>
            <button type="button" className="p-1.5 hover:bg-gray-200 rounded-full transition-colors" title="GIF">
              <FileImage className="w-5 h-5 text-gray-600" />
            </button>
            {content.trim() && (
              <button
                type="button"
                onClick={handleSubmit}
                className="p-1.5 hover:bg-emerald-50 rounded-full text-emerald-600 hover:text-emerald-700 transition-colors"
                title="Gửi"
              >
                <Send className="w-5 h-5 fill-current" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

