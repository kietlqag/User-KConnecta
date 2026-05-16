import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Link2, MessageCircle, Users, Share2, Newspaper, Facebook, Twitter, ArrowLeft, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useFriendConversations } from '@/features/messenger/hooks/useFriendConversations';
import { useChatSocket } from '@/features/messenger/hooks/useChatSocket';
import { authService } from '@/services/authService';
import { postService } from '@/services/postService';

const POST_SHARE_PREFIX = '__POST_SHARE__:';

interface PostShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postContent?: string;
  postImage?: string;
  onShareComplete?: (newShareCount: number) => void;
}

export function PostShareModal({
  isOpen,
  onClose,
  postId,
  postContent,
  postImage,
  onShareComplete,
}: PostShareModalProps) {
  const navigate = useNavigate();
  const [isSharingNow, setIsSharingNow] = useState(false);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { conversations, loading: loadingFriends } = useFriendConversations();
  const token = authService.getCurrentUser()?.token;

  const filteredConversations = useMemo(
    () =>
      searchQuery.trim()
        ? conversations.filter((c) =>
            c.user.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
          )
        : conversations,
    [conversations, searchQuery],
  );

  const { sendMessage } = useChatSocket(
    token,
    () => {},
    () => {},
    () => {},
    () => {},
  );

  const handleSendToFriend = (userId: string, userName: string) => {
    const shareContent = `${POST_SHARE_PREFIX}${JSON.stringify({
      id: postId,
      content: postContent,
      image: postImage,
    })}`;
    sendMessage(userId, shareContent);
    toast.success(`Đã gửi cho ${userName}`);
    setShowFriendPicker(false);
    setSearchQuery('');
    onClose();
  };

  const handleShareNow = async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      toast.error('Bạn cần đăng nhập để chia sẻ');
      return;
    }
    try {
      setIsSharingNow(true);
      const response = await postService.sharePost(postId, { userId: currentUser.id });
      onShareComplete?.(response.shareCount);
      toast.success('Đã chia sẻ bài viết');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể chia sẻ bài viết');
    } finally {
      setIsSharingNow(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/posts/${postId}`);
    toast.success('Đã sao chép liên kết vào bộ nhớ tạm');
    onClose();
  };

  const shareOptions = [
    {
      icon: <Send className="w-5 h-5" />,
      label: isSharingNow ? 'Đang chia sẻ...' : 'Chia sẻ ngay (Công khai)',
      onClick: handleShareNow,
      color: 'bg-emerald-100 text-emerald-600',
      disabled: isSharingNow,
    },
    {
      icon: <Newspaper className="w-5 h-5" />,
      label: 'Chia sẻ lên tin',
      onClick: () => {
        onClose();
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          postService.sharePost(postId, { userId: currentUser.id }).then((res) => {
            onShareComplete?.(res.shareCount);
          }).catch(() => {});
        }
        navigate('/stories/create', {
          state: {
            sharedImageUrl: postImage || null,
            sharedText: postImage ? null : (postContent || null),
          },
        });
      },
      color: 'bg-blue-100 text-blue-600',
      disabled: false,
    },
    {
      icon: <MessageCircle className="w-5 h-5" />,
      label: 'Gửi qua Messenger',
      onClick: () => setShowFriendPicker(true),
      color: 'bg-indigo-100 text-indigo-600',
      disabled: false,
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: 'Chia sẻ vào Nhóm',
      onClick: () => { toast.info('Tính năng đang được phát triển'); onClose(); },
      color: 'bg-orange-100 text-orange-600',
      disabled: false,
    },
    {
      icon: <Link2 className="w-5 h-5" />,
      label: 'Sao chép liên kết',
      onClick: handleCopyLink,
      color: 'bg-gray-100 text-gray-600',
      disabled: false,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setShowFriendPicker(false);
        setSearchQuery('');
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white rounded-2xl border-none shadow-2xl">
        {showFriendPicker ? (
          <>
            <DialogHeader className="p-4 border-b">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setShowFriendPicker(false); setSearchQuery(''); }}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
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
                  className="w-full rounded-full bg-gray-100 py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <div className="overflow-y-auto flex-1" style={{ maxHeight: '45vh' }}>
                {loadingFriends ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                        <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
                        <div className="flex-1 h-4 bg-gray-200 rounded" />
                        <div className="w-14 h-8 bg-gray-200 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : filteredConversations.length > 0 ? (
                  filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={conv.user.avatar}
                          alt={conv.user.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        {conv.user.isOnline && (
                          <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                        )}
                      </div>
                      <span className="flex-1 text-sm font-semibold text-gray-800 truncate">
                        {conv.user.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSendToFriend(conv.user.id, conv.user.name)}
                        className="shrink-0 rounded-full bg-indigo-100 px-4 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-200 transition-colors cursor-pointer"
                      >
                        Gửi
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

            <div className="p-4">
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-500 mb-4 px-2 uppercase tracking-widest">
                  Gửi trong Messenger
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide min-h-[100px] items-center">
                  {loadingFriends ? (
                    <div className="flex gap-4 w-full px-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2 min-w-[70px] animate-pulse">
                          <div className="w-14 h-14 rounded-full bg-gray-200" />
                          <div className="h-2 w-12 bg-gray-200 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : conversations.length > 0 ? (
                    conversations.slice(0, 8).map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => handleSendToFriend(conv.user.id, conv.user.name)}
                        className="flex flex-col items-center gap-2 min-w-[80px] hover:bg-gray-50 p-2 rounded-xl transition-colors cursor-pointer group"
                      >
                        <div className="relative">
                          <img
                            src={conv.user.avatar}
                            alt={conv.user.name}
                            className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover group-hover:scale-105 transition-transform"
                          />
                          {conv.user.isOnline && (
                            <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                          )}
                        </div>
                        <span className="text-[11px] text-gray-700 font-semibold text-center line-clamp-1 w-full">
                          {conv.user.name.split(' ').pop()}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="text-center w-full py-4 text-gray-400 text-sm">
                      Chưa có cuộc hội thoại nào
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {shareOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={option.onClick}
                    disabled={option.disabled}
                    className="flex items-center gap-4 p-3 w-full hover:bg-gray-50 rounded-xl transition-all cursor-pointer group disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className={`w-10 h-10 rounded-full ${option.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      {option.icon}
                    </div>
                    <span className="text-gray-700 font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t flex justify-center gap-6">
              <button className="text-blue-600 hover:scale-110 transition-transform cursor-pointer">
                <Facebook className="w-6 h-6" />
              </button>
              <button className="text-sky-500 hover:scale-110 transition-transform cursor-pointer">
                <Twitter className="w-6 h-6" />
              </button>
              <button className="text-emerald-500 hover:scale-110 transition-transform cursor-pointer">
                <Share2 className="w-6 h-6" />
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
