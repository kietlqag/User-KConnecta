import React from 'react';
import { ArrowLeft, Info, Phone, PhoneOff, Video } from 'lucide-react';
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
}) => {
  const voiceCallTitle = hasActiveVoiceCall ? 'Kết thúc cuộc gọi' : 'Gọi thoại';
  const presenceLabel = formatLastActiveLabel(user.isOnline, user.lastActiveAt);

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {fullScreen && (
          <button
            onClick={onClose}
            className="-ml-2 cursor-pointer rounded-full p-2 transition-colors hover:bg-gray-100"
            title="Quay lại danh sách chat"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
        )}
        <div className="relative">
          <img
            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
            alt={user.name}
            className="h-10 w-10 rounded-full object-cover"
          />
          {user.isOnline && <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-gray-900">{user.name}</h3>
          {presenceLabel ? <p className="truncate text-xs text-gray-500">{presenceLabel}</p> : null}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={hasActiveVoiceCall ? onEndVoiceCall : onStartVoiceCall}
          disabled={hasActiveVoiceCall ? false : !connected || !canStartVoiceCall}
          className="cursor-pointer rounded-full p-2.5 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          title={voiceCallTitle}
        >
          {hasActiveVoiceCall ? (
            <PhoneOff className="h-5 w-5 text-red-500" />
          ) : (
            <Phone className={`h-5 w-5 ${isStartingVoiceCall ? 'text-amber-500' : 'text-blue-600'}`} />
          )}
        </button>
        <button
          onClick={onStartVideoCall}
          disabled={hasActiveVoiceCall || !connected || !canStartVideoCall}
          className="cursor-pointer rounded-full p-2.5 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          title="Gọi video"
        >
          <Video className={`h-[22px] w-[22px] ${isVideoCall ? 'text-emerald-600' : 'text-blue-600'}`} />
        </button>
        {fullScreen && (
          <button className="cursor-pointer rounded-full p-2.5 transition-colors hover:bg-gray-100" title="Thông tin">
            <Info className="h-5 w-5 text-blue-600" />
          </button>
        )}
      </div>
    </div>
  );
};
