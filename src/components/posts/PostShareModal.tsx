import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Link2, MessageCircle, Users, Newspaper, ArrowLeft, Search, Globe, Lock, Smile, ChevronDown } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useFriendConversations } from '@/features/messenger/hooks/useFriendConversations';
import { useChatSocket } from '@/features/messenger/hooks/useChatSocket';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';
import { formatLivePostStoryText } from '@/lib/storyShareText';
import { UserAvatar } from '@/components/shared/UserAvatar';

const POST_SHARE_PREFIX = '__POST_SHARE__:';

type Privacy = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';

const PRIVACY_OPTIONS: { value: Privacy; label: string; icon: React.ReactNode }[] = [
  { value: 'PUBLIC', label: 'Công khai', icon: <Globe className="w-4 h-4" /> },
  { value: 'FRIENDS', label: 'Bạn bè', icon: <Users className="w-4 h-4" /> },
  { value: 'PRIVATE', label: 'Chỉ mình tôi', icon: <Lock className="w-4 h-4" /> },
];

interface PostShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  parentShareId?: string;
  postContent?: string;
  postImage?: string;
  postAuthorName?: string;
  isLivePost?: boolean;
  onShareComplete?: (response: import('@/services/postService').PostShareResponse) => void;
}

export function PostShareModal({
  isOpen,
  onClose,
  postId,
  parentShareId,
  postContent,
  postImage,
  postAuthorName,
  isLivePost = false,
  onShareComplete,
}: PostShareModalProps) {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [isSharingNow, setIsSharingNow] = useState(false);
  const [sendingToUserId, setSendingToUserId] = useState<string | null>(null);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>('PUBLIC');
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const privacyRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const { conversations, loading: loadingFriends } = useFriendConversations();
  const token = currentUser?.token;

  const selectedPrivacy = PRIVACY_OPTIONS.find((o) => o.value === privacy)!;

  const filteredConversations = useMemo(
    () =>
      searchQuery.trim()
        ? conversations.filter((c) =>
            c.user.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
          )
        : conversations,
    [conversations, searchQuery],
  );

  const { sendMessage } = useChatSocket(token, () => {}, () => {}, () => {}, () => {});

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (privacyRef.current && !privacyRef.current.contains(e.target as Node)) {
        setShowPrivacyMenu(false);
      }
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClose = () => {
    setShowFriendPicker(false);
    setSearchQuery('');
    setCaption('');
    setPrivacy('PUBLIC');
    setShowPrivacyMenu(false);
    setShowEmojiPicker(false);
    setSendingToUserId(null);
    onClose();
  };

  const handleEmojiSelect = (emoji: { native: string }) => {
    const ta = textareaRef.current;
    if (!ta) {
      setCaption((prev) => prev + emoji.native);
      return;
    }
    const start = ta.selectionStart ?? caption.length;
    const end = ta.selectionEnd ?? caption.length;
    const next = caption.slice(0, start) + emoji.native + caption.slice(end);
    setCaption(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + emoji.native.length, start + emoji.native.length);
    }, 0);
  };

  const buildMessengerShareContent = () =>
    `${POST_SHARE_PREFIX}${JSON.stringify({
      id: postId,
      content: postContent,
      image: postImage,
      authorName: postAuthorName,
    })}`;

  const handleSendToFriend = async (userId: string, userName: string) => {
    if (sendingToUserId) return;

    setSendingToUserId(userId);
    try {
      sendMessage(userId, buildMessengerShareContent());
      toast.success(`Đã gửi cho ${userName} qua Messenger`);
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể gửi qua Messenger');
    } finally {
      setSendingToUserId(null);
    }
  };

  const handleShareToFeed = async () => {
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để chia sẻ');
      return;
    }
    try {
      setIsSharingNow(true);
      const response = await postService.sharePost(postId, {
        userId: currentUser.id,
        sharedContent: caption.trim() || undefined,
        privacy,
        parentShareId,
      });
      onShareComplete?.(response);
      toast.success('Đã đăng bài chia sẻ lên bảng tin');
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể chia sẻ bài viết');
    } finally {
      setIsSharingNow(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/posts/${postId}`);
    toast.success('Đã sao chép liên kết vào bộ nhớ tạm');
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-visible bg-white dark:bg-gray-800 rounded-2xl border-none shadow-2xl">
        <DialogDescription className="sr-only">Chia sẻ bài viết lên bảng tin hoặc gửi cho bạn bè</DialogDescription>
        {showFriendPicker ? (
          <>
            <DialogHeader className="p-4 border-b">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setShowFriendPicker(false); setSearchQuery(''); }}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <DialogTitle className="text-lg font-bold">Gửi qua Messenger</DialogTitle>
              </div>
            </DialogHeader>

            <div className="p-4 flex flex-col gap-3" style={{ maxHeight: '60vh' }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm bạn bè..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full bg-gray-100 dark:bg-gray-900 py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div className="overflow-y-auto flex-1" style={{ maxHeight: '45vh' }}>
                {loadingFriends ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                        <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="w-14 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : filteredConversations.length > 0 ? (
                  filteredConversations.map((conv) => (
                    <div key={conv.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="relative shrink-0">
                        <UserAvatar
                          name={conv.user.name}
                          avatarUrl={conv.user.avatar}
                          userId={conv.user.id}
                          className="w-12 h-12"
                          rounded="full"
                          initialsClassName="text-sm font-bold"
                        />
                        {conv.user.isOnline && (
                          <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                        )}
                      </div>
                      <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{conv.user.name}</span>
                      <button
                        type="button"
                        disabled={sendingToUserId === conv.user.id}
                        onClick={() => void handleSendToFriend(conv.user.id, conv.user.name)}
                        className="shrink-0 rounded-full bg-indigo-100 px-4 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-200 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {sendingToUserId === conv.user.id ? 'Đang gửi...' : 'Gửi'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-sm text-gray-400">
                    {searchQuery ? 'Không tìm thấy bạn bè' : 'Chưa có bạn bè nào'}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="text-center text-xl font-bold">Chia sẻ</DialogTitle>
            </DialogHeader>

            <div className="p-4 flex flex-col gap-4">
              {/* User info + privacy */}
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={currentUser?.fullName || 'Bạn'}
                  avatarUrl={currentUser?.avatarUrl}
                  userId={currentUser?.id}
                  className="w-10 h-10 shrink-0"
                  rounded="full"
                  initialsClassName="text-sm font-bold"
                />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                    {currentUser?.fullName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-gray-100 dark:bg-gray-900 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                      Bảng feed
                    </span>
                    {/* Privacy dropdown */}
                    <div className="relative" ref={privacyRef}>
                      <button
                        type="button"
                        onClick={() => setShowPrivacyMenu((v) => !v)}
                        className="flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-900 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      >
                        {selectedPrivacy.icon}
                        <span>{selectedPrivacy.label}</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {showPrivacyMenu && (
                        <div className="absolute left-0 top-full mt-1 z-50 w-44 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-xl py-1">
                          {PRIVACY_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => { setPrivacy(opt.value); setShowPrivacyMenu(false); }}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${privacy === opt.value ? 'font-semibold text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}
                            >
                              {opt.icon}
                              {opt.label}
                              {privacy === opt.value && <span className="ml-auto text-blue-500">✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Caption input */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Hãy nói gì đó về nội dung này..."
                  rows={3}
                  maxLength={1000}
                  className="w-full resize-none rounded-xl border-none bg-transparent px-0 py-1 text-base text-gray-800 dark:text-gray-200 outline-none placeholder:text-gray-400"
                />
                {/* Emoji button */}
                <div className="relative" ref={emojiRef}>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((v) => !v)}
                    className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-muted hover:text-yellow-500 transition-colors cursor-pointer"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-10 right-0 z-50">
                      <Picker
                        data={data}
                        onEmojiSelect={handleEmojiSelect}
                        locale="vi"
                        theme="light"
                        previewPosition="none"
                        skinTonePosition="none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Đăng bài lên feed */}
              <button
                type="button"
                onClick={() => void handleShareToFeed()}
                disabled={isSharingNow}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSharingNow ? 'Đang đăng...' : 'Đăng bài'}
              </button>

              <div className="h-px bg-gray-100 dark:bg-gray-900" />

              {/* Messenger quick-send */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-widest">
                  Gửi bằng Messenger
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide min-h-[90px] items-center">
                  {loadingFriends ? (
                    <div className="flex gap-3 w-full">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5 min-w-[64px] animate-pulse">
                          <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700" />
                          <div className="h-2 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : conversations.length > 0 ? (
                    <>
                      {conversations.slice(0, 7).map((conv) => (
                        <button
                          key={conv.id}
                          type="button"
                          disabled={Boolean(sendingToUserId)}
                          onClick={() => void handleSendToFriend(conv.user.id, conv.user.name)}
                          className="flex flex-col items-center gap-1.5 min-w-[64px] hover:opacity-80 transition-opacity cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <div className="relative">
                            <UserAvatar
                              name={conv.user.name}
                              avatarUrl={conv.user.avatar}
                              userId={conv.user.id}
                              className="w-14 h-14 border-2 border-white shadow-sm dark:shadow-none group-hover:scale-105 transition-transform"
                              rounded="full"
                              initialsClassName="text-base font-bold"
                            />
                            {conv.user.isOnline && (
                              <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                            )}
                          </div>
                          <span className="text-[11px] text-gray-700 dark:text-gray-300 font-medium text-center line-clamp-1 w-full">
                            {conv.user.name.split(' ').pop()}
                          </span>
                        </button>
                      ))}
                      {conversations.length > 7 && (
                        <button
                          type="button"
                          onClick={() => setShowFriendPicker(true)}
                          className="flex flex-col items-center gap-1.5 min-w-[64px] hover:opacity-80 cursor-pointer"
                        >
                          <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                            <span className="text-xl text-gray-500 dark:text-gray-400">›</span>
                          </div>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">Xem thêm</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="text-center w-full py-4 text-gray-400 text-sm">
                      Chưa có cuộc hội thoại nào
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-gray-100 dark:bg-gray-900" />

              {/* Secondary options */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    navigate('/stories/create', {
                      state: {
                        sharedPostId: postId,
                        sharedImageUrl: postImage || null,
                        sharedText: postImage
                          ? null
                          : (isLivePost && postContent
                            ? formatLivePostStoryText(postContent)
                            : (postContent || null)),
                        sharedIsLive: isLivePost,
                      },
                    });
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Newspaper className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium text-center leading-tight">Chia sẻ lên tin</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowFriendPicker(true)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium text-center leading-tight">Messenger</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium text-center leading-tight">Sao chép liên kết</span>
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
