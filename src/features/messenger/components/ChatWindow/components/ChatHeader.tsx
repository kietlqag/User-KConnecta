import React from 'react';
import { Phone, PhoneOff, Video, Info, ArrowLeft } from 'lucide-react';
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
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3 min-w-0">
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
            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
            alt={user.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          {user.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate">{user.name}</h3>
          <p className="text-xs text-gray-500 truncate">
            {formatLastActiveLabel(user.isOnline, user.lastActiveAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={hasActiveVoiceCall ? onEndVoiceCall : onStartVoiceCall}
          disabled={hasActiveVoiceCall ? false : !connected || !canStartVoiceCall}
          className="p-2.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title={hasActiveVoiceCall ? 'Kết thúc cuộc gọi' : 'Gọi thoại'}
        >
          {hasActiveVoiceCall ? (
            <PhoneOff className="w-5 h-5 text-red-500" />
          ) : (
            <Phone className={`w-5 h-5 ${isStartingVoiceCall ? 'text-amber-500' : 'text-blue-600'}`} />
          )}
        </button>
        <button
          onClick={onStartVideoCall}
          disabled={hasActiveVoiceCall || !connected || !canStartVideoCall}
          className="p-2.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Gọi video"
        >
          <Video className={`w-[22px] h-[22px] ${isVideoCall ? 'text-emerald-600' : 'text-blue-600'}`} />
        </button>
        {fullScreen && (
          <button className="p-2.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" title="Thông tin">
            <Info className="w-5 h-5 text-blue-600" />
          </button>
        )}
      </div>
    </div>
  );
};
