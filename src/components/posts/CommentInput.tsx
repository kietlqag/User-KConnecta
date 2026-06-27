import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { Smile, Image, Send, X, Loader2 } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { toast } from 'sonner';
import { postService } from '@/services/postService';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface CommentInputProps {
  onSubmit: (content: string, imageUrl?: string) => void;
  placeholder?: string;
  userName?: string;
  userId?: string;
  userAvatar?: string | null;
  autoFocus?: boolean;
  /** Cho phép đính kèm 1 ảnh (chỉ bật ở ô bình luận cấp 1, không bật cho trả lời). */
  enableImage?: boolean;
}

export function CommentInput({
  onSubmit,
  placeholder = 'Bình luận...',
  userName = 'Bạn',
  userId,
  userAvatar,
  autoFocus = false,
  enableImage = false,
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const onClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showEmojiPicker]);

  const handleEmojiSelect = (emoji: { native?: string }) => {
    const native = emoji.native;
    if (!native) return;
    const input = inputRef.current;
    const start = input?.selectionStart ?? content.length;
    const end = input?.selectionEnd ?? content.length;
    const next = `${content.slice(0, start)}${native}${content.slice(end)}`;
    setContent(next);
    // Đưa con trỏ về sau emoji vừa chèn
    requestAnimationFrame(() => {
      input?.focus();
      const caret = start + native.length;
      input?.setSelectionRange(caret, caret);
    });
  };

  const handleImageSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset để chọn lại cùng 1 ảnh vẫn kích hoạt
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp ảnh');
      return;
    }
    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);
    try {
      setIsUploading(true);
      const { url } = await postService.uploadPostImage(file);
      setImageUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tải ảnh thất bại');
      URL.revokeObjectURL(localPreview);
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageUrl(null);
  };

  const handleSubmit = () => {
    const text = content.trim();
    if (isUploading) return;
    if (!text && !imageUrl) return;
    onSubmit(text, imageUrl ?? undefined);
    setContent('');
    removeImage();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = (content.trim().length > 0 || imageUrl != null) && !isUploading;

  return (
    <div className="flex items-start gap-2">
      <div className="w-8 h-8 shrink-0 mt-1">
        <UserAvatar
          name={userName}
          avatarUrl={userAvatar}
          userId={userId}
          className="w-8 h-8"
          rounded="full"
          initialsClassName="text-xs font-bold"
        />
      </div>

      <div className="flex-1">
        {/* Ảnh xem trước */}
        {imagePreview && (
          <div className="mb-2 inline-block relative">
            <img src={imagePreview} alt="Ảnh đính kèm" className="max-h-40 rounded-lg border border-border object-cover" />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
            <button
              type="button"
              onClick={removeImage}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-card text-white shadow hover:bg-black cursor-pointer"
              title="Gỡ ảnh"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div
          className={`bg-background rounded-full flex items-center px-3 py-2 transition-all ${ isFocused ? 'ring-1 ring-emerald-500' : '' }`}
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
            autoFocus={autoFocus}
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-muted-foreground"
          />

          <div className="ml-2 flex items-center gap-1">
            <div className="relative" ref={emojiPickerRef}>
              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 z-50 mb-2 overflow-hidden rounded-lg shadow-xl">
                  <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="light" locale="vi" previewPosition="none" />
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="p-1.5 hover:bg-muted rounded-full transition-colors cursor-pointer"
                title="Emoji"
              >
                <Smile className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            {enableImage && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelected}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-1.5 hover:bg-muted rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Ảnh"
                >
                  <Image className="w-5 h-5 text-muted-foreground" />
                </button>
              </>
            )}
            {canSend && (
              <button
                type="button"
                onClick={handleSubmit}
                className="p-1.5 hover:bg-emerald-50 rounded-full text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
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
