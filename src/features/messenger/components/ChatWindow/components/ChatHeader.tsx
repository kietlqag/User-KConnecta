import React from 'react';
import { ArrowLeft, Info, Phone, PhoneOff, Video } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { ChatUser } from '../../../types/message.types';
import { formatLastActiveLabel } from '../../../utils/presenceLabel';

interface ChatHeaderProps {
  user: ChatUser;
  connected: boolean;
  fullScreen?: boolean;
  onClose: () => void;
  hasActiveVoiceCall: boolean;
  isStartingVoiceCall: boolean;
  isVideoCall: boolean;
  onEndVoiceCall: () => void;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
  canStartVoiceCall: boolean;
  canStartVideoCall: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  isChatInfoOpen?: boolean;
  onToggleChatInfo?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  user,
  connected,
  fullScreen,
  onClose,
  hasActiveVoiceCall,
  isStartingVoiceCall,
  isVideoCall,
  onEndVoiceCall,
  onStartVoiceCall,
  onStartVideoCall,
  canStartVoiceCall,
  canStartVideoCall,
  isChatInfoOpen = true,
  onToggleChatInfo,
}) => {
  const voiceCallTitle = hasActiveVoiceCall ? 'Kết thúc cuộc gọi' : 'Gọi thoại';
  const presenceLabel = formatLastActiveLabel(user.isOnline, user.lastActiveAt);

  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {fullScreen && (
          <button
            onClick={onClose}
            className="-ml-2 cursor-pointer rounded-full p-2 transition-colors hover:bg-muted"
            title="Quay lại danh sách chat"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
        )}
        <div className="relative">
          <UserAvatar
            name={user.name}
            avatarUrl={user.avatar}
            userId={user.id}
            variant={user.id.startsWith('group:') ? 'group' : 'user'}
            rounded="full"
            className="h-10 w-10"
          />
          {user.isOnline && <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{user.name}</h3>
          {presenceLabel ? <p className="truncate text-xs text-muted-foreground">{presenceLabel}</p> : null}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={hasActiveVoiceCall ? onEndVoiceCall : onStartVoiceCall}
          disabled={hasActiveVoiceCall ? false : !connected || !canStartVoiceCall}
          className="cursor-pointer rounded-full p-2.5 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          title={voiceCallTitle}
        >
          {hasActiveVoiceCall ? (
            <PhoneOff className="h-5 w-5 text-red-500" />
          ) : (
            <Phone className={`h-5 w-5 ${isStartingVoiceCall ? 'text-amber-500' : 'text-emerald-600'}`} />
          )}
        </button>
        <button
          onClick={onStartVideoCall}
          disabled={hasActiveVoiceCall || !connected || !canStartVideoCall}
          className="cursor-pointer rounded-full p-2.5 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          title="Gọi video"
        >
          <Video className={`h-[22px] w-[22px] ${isVideoCall ? 'text-emerald-600' : 'text-emerald-600'}`} />
        </button>
        {fullScreen && onToggleChatInfo && (
          <button
            type="button"
            onClick={onToggleChatInfo}
            className={`cursor-pointer rounded-full p-2.5 transition-colors hover:bg-muted ${ isChatInfoOpen ? 'bg-emerald-50 dark:bg-emerald-900/30' : '' }`}
            title={isChatInfoOpen ? 'Ẩn thông tin' : 'Hiện thông tin'}
          >
            <Info className={`h-5 w-5 ${isChatInfoOpen ? 'text-emerald-600' : 'text-muted-foreground'}`} />
          </button>
        )}
      </div>
    </div>
  );
};
