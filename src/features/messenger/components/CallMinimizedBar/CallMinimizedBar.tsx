import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff, Volume1, Volume2 } from 'lucide-react';

type CallMode = 'incoming' | 'in_call' | 'outgoing';

import { UserAvatar } from '@/components/shared/UserAvatar';

interface CallUser {
  name: string;
  avatar: string;
}

interface CallMinimizedBarProps {
  show: boolean;
  user: CallUser;
  mode: CallMode;
  statusText: string;
  incomingText: string;
  isVideoCall?: boolean;
  speakerMode?: 'inner' | 'outer';
  isCameraEnabled?: boolean;
  isMuted?: boolean;
  containerClassName: string;
  onOpen: () => void;
  onRejectIncoming?: () => void;
  onAcceptIncoming?: () => void;
  onToggleSpeaker?: () => void;
  onToggleCamera?: () => void;
  onToggleMute?: () => void;
  onEndCall?: () => void;
}

export function CallMinimizedBar({
  show,
  user,
  mode,
  statusText,
  incomingText,
  isVideoCall = false,
  speakerMode = 'inner',
  isCameraEnabled = true,
  isMuted = false,
  containerClassName,
  onOpen,
  onRejectIncoming,
  onAcceptIncoming,
  onToggleSpeaker,
  onToggleCamera,
  onToggleMute,
  onEndCall,
}: CallMinimizedBarProps) {
  if (!show) return null;

  return (
    <div
      onClick={onOpen}
      className={`${containerClassName} bg-card border border-border shadow-lg rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer`}
      style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
      title="Mở lại cuộc gọi"
    >
      <UserAvatar name={user.name} avatarUrl={user.avatar} rounded="full" className="w-8 h-8" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground truncate max-w-[180px]">{user.name}</p>
        <p className="text-xs text-muted-foreground">{mode === 'incoming' ? incomingText : statusText}</p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {mode === 'incoming' ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRejectIncoming?.();
              }} className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center"
              title="Từ chối"
            >
              <PhoneOff className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAcceptIncoming?.();
              }} className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
              title="Nghe máy"
            >
              <Phone className="w-4 h-4 text-white" />
            </button>
          </>
        ) : mode === 'in_call' ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSpeaker?.();
              }} className={`w-8 h-8 rounded-full transition-colors flex items-center justify-center ${ speakerMode === 'outer' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-background hover:bg-muted' }`}
              title={speakerMode === 'outer' ? 'Đang loa ngoài' : 'Đang loa trong'}
            >
              {speakerMode === 'outer' ? (
                <Volume2 className="w-4 h-4 text-white" />
              ) : (
                <Volume1 className="w-4 h-4 text-foreground" />
              )}
            </button>
            {isVideoCall && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCamera?.();
                }} className={`w-8 h-8 rounded-full transition-colors flex items-center justify-center ${ isCameraEnabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-background hover:bg-muted' }`}
                title={isCameraEnabled ? 'Tắt camera' : 'Bật camera'}
              >
                {isCameraEnabled ? <Video className="w-4 h-4 text-white" /> : <VideoOff className="w-4 h-4 text-foreground" />}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleMute?.();
              }} className={`w-8 h-8 rounded-full transition-colors flex items-center justify-center ${ isMuted ? 'bg-background hover:bg-muted' : 'bg-emerald-600 hover:bg-emerald-700' }`}
              title={isMuted ? 'Bật mic' : 'Tắt mic'}
            >
              {isMuted ? <MicOff className="w-4 h-4 text-foreground" /> : <Mic className="w-4 h-4 text-white" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEndCall?.();
              }} className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center"
              title="Kết thúc cuộc gọi"
            >
              <PhoneOff className="w-4 h-4 text-white" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSpeaker?.();
              }} className={`w-8 h-8 rounded-full transition-colors flex items-center justify-center ${ speakerMode === 'outer' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-background hover:bg-muted' }`}
              title={speakerMode === 'outer' ? 'Đang loa ngoài' : 'Đang loa trong'}
            >
              {speakerMode === 'outer' ? (
                <Volume2 className="w-4 h-4 text-white" />
              ) : (
                <Volume1 className="w-4 h-4 text-foreground" />
              )}
            </button>
            {isVideoCall && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCamera?.();
                }} className={`w-8 h-8 rounded-full transition-colors flex items-center justify-center ${ isCameraEnabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-background hover:bg-muted' }`}
                title={isCameraEnabled ? 'Tắt camera' : 'Bật camera'}
              >
                {isCameraEnabled ? <Video className="w-4 h-4 text-white" /> : <VideoOff className="w-4 h-4 text-foreground" />}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEndCall?.();
              }} className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center"
              title="Kết thúc cuộc gọi"
            >
              <PhoneOff className="w-4 h-4 text-white" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}


