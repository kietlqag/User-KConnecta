import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Link2, MessageCircle, ArrowLeft, Search, Globe, Lock, Smile, ChevronDown, Newspaper, Users } from 'lucide-react';
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
import { useRealtimeCall } from '@/contexts/RealtimeCallContext';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';
import { albumService } from '@/services/albumService';
import { UserAvatar } from '@/components/shared/UserAvatar';
import type { SharePrivacy } from './shareConstants';
import type { ShareTarget } from './shareTypes';
import { SharePreview } from './SharePreview';
import {
  buildMessengerShareContent,
  getFeedShareErrorMessage,
  getMessengerChipLabel,
  getShareLink,
  getSharePlaceholder,
  getStoryNavigateState,
} from './shareHelpers';

const PRIVACY_OPTIONS: { value: SharePrivacy; label: string; icon: React.ReactNode }[] = [
  { value: 'PUBLIC', label: 'Công khai', icon: <Globe className="w-4 h-4" /> },
  { value: 'FRIENDS', label: 'Bạn bè', icon: <Users className="w-4 h-4" /> },
  { value: 'PRIVATE', label: 'Chỉ mình tôi', icon: <Lock className="w-4 h-4" /> },
];

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: ShareTarget;
  title?: string;
}

export function ShareModal({ isOpen, onClose, target, title = 'Chia sẻ' }: ShareModalProps) {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [isSharingNow, setIsSharingNow] = useState(false);
  const [sendingToUserId, setSendingToUserId] = useState<string | null>(null);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState<SharePrivacy>('PUBLIC');
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerPos, setEmojiPickerPos] = useState({ top: 0, right: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const privacyRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const { conversations, loading: loadingFriends } = useFriendConversations();
  const { sendMessage } = useRealtimeCall();

  const filteredConversations = useMemo(
    () =>
      searchQuery.trim()
        ? conversations.filter((c) =>
            c.user.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
          )
        : conversations,
    [conversations, searchQuery],
  );

  const selectedPrivacy = PRIVACY_OPTIONS.find((o) => o.value === privacy)!;
  const placeholder = getSharePlaceholder(target);
  const storyState = getStoryNavigateState(target);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (privacyRef.current && !privacyRef.current.contains(e.target as Node)) {
        setShowPrivacyMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      const node = e.target as Node;
      const insidePicker = emojiPickerRef.current?.contains(node);
      const insideButton = emojiButtonRef.current?.contains(node);
      if (!insidePicker && !insideButton) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

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

  const handleSendToFriend = async (userId: string, userName: string) => {
    if (sendingToUserId) return;

    setSendingToUserId(userId);
    try {
      sendMessage(userId, buildMessengerShareContent(target));
      if (target.type === 'album') {
        void albumService.sendToUser(target.albumId, userId).catch(() => {});
      }
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
      if (target.type === 'post') {
        const response = await postService.sharePost(target.postId, {
          userId: currentUser.id,
          sharedContent: caption.trim() || undefined,
          privacy,
          parentShareId: target.parentShareId,
        });
        target.onShareComplete?.(response);
      } else if (target.type === 'album') {
        const response = await postService.createPost({
          authorId: currentUser.id,
          content: caption.trim(),
          privacy,
          status: 'PUBLISHED',
          sharedAlbumId: target.albumId,
          imageUrl: target.coverUrl || undefined,
        });
        target.onShareComplete?.(response);
      } else {
        const response = await postService.createPost({
          authorId: currentUser.id,
          content: caption.trim(),
          privacy,
          status: 'PUBLISHED',
          sharedGroupId: target.groupId,
        });
        target.onShareComplete?.(response);
      }
      toast.success('Đã đăng bài chia sẻ lên bảng tin');
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : getFeedShareErrorMessage(target));
    } finally {
      setIsSharingNow(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareLink(target));
    toast.success('Đã sao chép liên kết vào bộ nhớ tạm');
    handleClose();
  };

  const handleShareToStory = () => {
    if (!storyState) return;
    handleClose();
    navigate('/stories/create', { state: storyState });
  };

  const srDescription =
    target.type === 'album'
      ? 'Chia sẻ album lên bảng tin hoặc gửi cho bạn bè'
      : target.type === 'group'
        ? 'Chia sẻ nhóm lên bảng tin hoặc gửi cho bạn bè'
        : 'Chia sẻ bài viết lên bảng tin hoặc gửi cho bạn bè';

  const stopWheelBubble = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent
        data-share-modal
        className="!flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[500px] rounded-2xl border-none bg-white shadow-2xl dark:bg-gray-800"
        onWheel={stopWheelBubble}
      >
        {showFriendPicker ? (
          <>
            <DialogHeader className="shrink-0 border-b p-4">
              <DialogDescription className="sr-only">{srDescription}</DialogDescription>
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

            <div
              className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 pb-6"
              onWheel={stopWheelBubble}
            >
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm bạn bè..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-full bg-gray-100 dark:bg-gray-900 py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <div className="min-h-0">
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
                          className="shrink-0 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-200 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="shrink-0 border-b p-4">
              <DialogDescription className="sr-only">{srDescription}</DialogDescription>
              <DialogTitle className="text-center text-xl font-bold">{title}</DialogTitle>
            </DialogHeader>

            <div
              className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 pb-6"
              onWheel={stopWheelBubble}
            >
              <div className="flex flex-col gap-3">
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
                                className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${privacy === opt.value ? 'font-semibold text-emerald-600' : 'text-gray-700 dark:text-gray-300'}`}
                              >
                                {opt.icon}
                                {opt.label}
                                {privacy === opt.value && <span className="ml-auto text-emerald-500">✓</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={placeholder}
                    rows={2}
                    maxLength={1000}
                    className="w-full resize-none rounded-xl border-none bg-transparent px-0 py-1 text-base text-gray-800 dark:text-gray-200 outline-none placeholder:text-gray-400"
                  />
                  <div className="relative">
                    <button
                      ref={emojiButtonRef}
                      type="button"
                      onClick={() => {
                        if (!showEmojiPicker && emojiButtonRef.current) {
                          const rect = emojiButtonRef.current.getBoundingClientRect();
                          setEmojiPickerPos({
                            top: rect.top - 8,
                            right: window.innerWidth - rect.right,
                          });
                        }
                        setShowEmojiPicker((v) => !v);
                      }}
                      className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-muted hover:text-yellow-500 transition-colors cursor-pointer"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <SharePreview target={target} />

                <button
                  type="button"
                  onClick={() => void handleShareToFeed()}
                  disabled={isSharingNow}
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSharingNow ? 'Đang đăng...' : 'Đăng bài'}
                </button>

                <div className="h-px bg-gray-100 dark:bg-gray-900" />

                <div>
                  <h3 className="mb-2.5 font-sans text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Gửi bằng Messenger
                  </h3>
                  <div className="scrollbar-thin -mx-1 flex flex-nowrap items-start gap-3 overflow-x-auto px-1 pb-1">
                    {loadingFriends ? (
                      <div className="flex flex-nowrap gap-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="flex w-[58px] shrink-0 flex-col items-center gap-1.5 animate-pulse">
                            <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                            <div className="h-[28px] w-10 rounded bg-gray-200 dark:bg-gray-700" />
                          </div>
                        ))}
                      </div>
                    ) : conversations.length > 0 ? (
                      <>
                        {conversations.map((conv) => (
                          <button
                            key={conv.id}
                            type="button"
                            disabled={Boolean(sendingToUserId)}
                            onClick={() => void handleSendToFriend(conv.user.id, conv.user.name)}
                            className="group flex w-[58px] shrink-0 flex-col items-center gap-1.5 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                          >
                            <div className="relative h-12 w-12 shrink-0">
                              <UserAvatar
                                name={conv.user.name}
                                avatarUrl={conv.user.avatar}
                                userId={conv.user.id}
                                className="h-12 w-12 border-2 border-white shadow-sm transition-transform group-hover:scale-105 dark:shadow-none"
                                rounded="full"
                                initialsClassName="text-base font-bold"
                              />
                              {conv.user.isOnline && (
                                <div className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
                              )}
                            </div>
                            <span className="flex min-h-[28px] w-full items-start justify-center text-center text-[11px] font-medium leading-tight text-gray-700 line-clamp-2 dark:text-gray-300">
                              {getMessengerChipLabel(conv.user.name)}
                            </span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setShowFriendPicker(true)}
                          className="flex w-[58px] shrink-0 flex-col items-center gap-1.5 hover:opacity-80 cursor-pointer"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
                            <Search className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          </div>
                          <span className="flex min-h-[28px] w-full items-start justify-center text-center text-[11px] font-medium leading-tight text-gray-500 line-clamp-2 dark:text-gray-400">
                            Tìm thêm
                          </span>
                        </button>
                      </>
                    ) : (
                      <div className="w-full py-3 text-center text-sm text-gray-400">
                        Chưa có cuộc hội thoại nào
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-900" />

                <div className="grid shrink-0 grid-cols-3 gap-1.5 pb-2">
                  {storyState && (
                    <button
                      type="button"
                      onClick={handleShareToStory}
                      className="flex flex-col items-center gap-1 rounded-xl p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                        <Newspaper className="h-4 w-4 text-emerald-600" />
                      </div>
                      <span className="text-center text-[11px] font-medium leading-tight text-gray-600 dark:text-gray-400">Chia sẻ lên tin</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowFriendPicker(true)}
                    className="flex flex-col items-center gap-1 rounded-xl p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                      <MessageCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-center text-[11px] font-medium leading-tight text-gray-600 dark:text-gray-400">Messenger</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex flex-col items-center gap-1 rounded-xl p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
                      <Link2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <span className="text-center text-[11px] font-medium leading-tight text-gray-600 dark:text-gray-400">Sao chép liên kết</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>

      {showEmojiPicker &&
        createPortal(
          <div
            ref={emojiPickerRef}
            className="fixed z-[200]"
            style={{
              bottom: window.innerHeight - emojiPickerPos.top,
              right: emojiPickerPos.right,
            }}
          >
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              locale="vi"
              theme="light"
              previewPosition="none"
              skinTonePosition="none"
            />
          </div>,
          document.body,
        )}
    </Dialog>
  );
}
