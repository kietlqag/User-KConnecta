import { 
  Send, 
  Link2, 
  MessageCircle, 
  Users, 
  Share2, 
  MessageSquare,
  Video,
  Facebook,
  Twitter
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { useFriendConversations } from '@/features/messenger/hooks/useFriendConversations';
import { useChatSocket } from '@/features/messenger/hooks/useChatSocket';
import { authService } from '@/services/authService';
import { Reel } from '../../types/watch.types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: () => void;
  reel: Reel;
}

const VIDEO_SHARE_PREFIX = '__VIDEO_SHARE__:';

export const ShareModal = ({ isOpen, onClose, onShare, reel }: ShareModalProps) => {
  const { conversations, loading: loadingFriends } = useFriendConversations();
  const token = authService.getCurrentUser()?.token;
  
  const { sendMessage } = useChatSocket(
    token,
    () => {}, // onMessage
    () => {}, // onCallSignal
    () => {}, // onMessageStatus
    () => {}  // onPresenceStatus
  );

  const handleCopyLink = () => {
    const link = `${window.location.origin}/watch?id=${reel.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Đã sao chép liên kết vào bộ nhớ tạm');
    onClose();
  };

  const shareOptions = [
    { 
      icon: <Send className="w-5 h-5" />, 
      label: 'Chia sẻ ngay (Công khai)', 
      onClick: () => {
        onShare();
        onClose();
      },
      color: 'bg-emerald-100 text-emerald-600'
    },
    { 
      icon: <MessageSquare className="w-5 h-5" />, 
      label: 'Chia sẻ lên Bảng tin', 
      onClick: () => {
        toast.info('Tính năng đang được phát triển');
        onClose();
      },
      color: 'bg-blue-100 text-blue-600'
    },
    { 
      icon: <MessageCircle className="w-5 h-5" />, 
      label: 'Gửi qua Messenger', 
      onClick: () => {
        toast.info('Tính năng đang được phát triển');
        onClose();
      },
      color: 'bg-indigo-100 text-indigo-600'
    },
    { 
      icon: <Users className="w-5 h-5" />, 
      label: 'Chia sẻ vào Nhóm', 
      onClick: () => {
        toast.info('Tính năng đang được phát triển');
        onClose();
      },
      color: 'bg-orange-100 text-orange-600'
    },
    { 
      icon: <Link2 className="w-5 h-5" />, 
      label: 'Sao chép liên kết', 
      onClick: handleCopyLink,
      color: 'bg-gray-100 text-gray-600'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white rounded-2xl border-none shadow-2xl">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-center text-xl font-bold">Chia sẻ</DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {/* Recent Contacts */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-500 mb-4 px-2 uppercase tracking-widest">Gửi trong Messenger</h3>
            
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
                conversations.map((conv) => (
                  <button 
                    key={conv.id} 
                    onClick={() => {
                      const shareContent = `${VIDEO_SHARE_PREFIX}${JSON.stringify({
                        id: reel.id,
                        thumbnail: reel.thumbnail,
                        caption: reel.caption,
                        authorId: reel.creator.id
                      })}`;
                      sendMessage(conv.user.id, shareContent);
                      toast.success(`Đã gửi cho ${conv.user.name}`);
                      onClose();
                    }}
                    className="flex flex-col items-center gap-2 min-w-[80px] hover:bg-gray-50 p-2 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="relative">
                      <img 
                        src={conv.user.avatar} 
                        alt={conv.user.name} 
                        className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover group-hover:scale-105 transition-transform" 
                      />
                      {conv.user.isOnline && (
                        <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-700 font-semibold text-center line-clamp-1 w-full">{conv.user.name.split(' ').pop()}</span>
                  </button>
                ))
              ) : (
                <div className="text-center w-full py-4 text-gray-400 text-sm">
                  Chưa có cuộc hội thoại nào
                </div>
              )}
            </div>
          </div>

          {/* Share Options */}
          <div className="grid grid-cols-1 gap-2">
            {shareOptions.map((option, index) => (
              <button
                key={index}
                onClick={option.onClick}
                className="flex items-center gap-4 p-3 w-full hover:bg-gray-50 rounded-xl transition-all cursor-pointer group"
              >
                <div className={`w-10 h-10 rounded-full ${option.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  {option.icon}
                </div>
                <span className="text-gray-700 font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* External Social Sharing */}
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
      </DialogContent>
    </Dialog>
  );
};
