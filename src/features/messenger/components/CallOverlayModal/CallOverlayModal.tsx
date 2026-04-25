import type { RefObject } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff, Volume1, Volume2, X } from 'lucide-react';

type CallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'in_call' | 'ended' | 'error';
type CallMediaType = 'audio' | 'video';

interface CallUser {
  name: string;
  avatar: string;
}

interface CallOverlayModalProps {
  mode: 'incoming' | 'ongoing';
  show: boolean;
  user: CallUser;
  callStatus?: CallStatus;
  callStatusText?: string;
  incomingMediaType?: CallMediaType;
  isVideoCall?: boolean;
  hasRemoteStream?: boolean;
  speakerMode?: 'inner' | 'outer';
  isCameraEnabled?: boolean;
  isMuted?: boolean;
  remoteVideoRef?: RefObject<HTMLVideoElement | null>;
  localVideoRef?: RefObject<HTMLVideoElement | null>;
  zIndexClassName?: string;
  onMinimize: () => void;
  onRejectIncoming?: () => void;
  onAcceptIncoming?: () => void;
  onToggleSpeaker?: () => void;
  onToggleCamera?: () => void;
  onToggleMute?: () => void;
  onEndCall?: () => void;
}

export function CallOverlayModal({
  mode,
  show,
  user,
  callStatus = 'idle',
  callStatusText = '',
  incomingMediaType = 'audio',
  isVideoCall = false,
  hasRemoteStream = false,
  speakerMode = 'inner',
  isCameraEnabled = true,
  isMuted = false,
  remoteVideoRef,
  localVideoRef,
  zIndexClassName = 'z-[130]',
  onMinimize,
  onRejectIncoming,
  onAcceptIncoming,
  onToggleSpeaker,
  onToggleCamera,
  onToggleMute,
  onEndCall,
}: CallOverlayModalProps) {
  if (!show) return null;

  if (mode === 'incoming') {
    return (
      <div className={`fixed inset-0 ${zIndexClassName} bg-black/20 flex items-center justify-center`}>
        <div
          className="w-[340px] rounded-2xl bg-white border border-gray-200 shadow-2xl p-5"
          style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
        >
          <div className="flex justify-end">
            <button
              onClick={onMinimize}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              title="Thu gọn cuộc gọi"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="text-center">
            <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full object-cover mx-auto" />
            <p className="mt-3 text-lg font-semibold text-gray-900">{user.name}</p>
            <p className="mt-1 text-sm text-gray-500">
              {incomingMediaType === 'video' ? 'Đang gọi video cho bạn' : 'Đang gọi thoại cho bạn'}
            </p>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={onRejectIncoming}
              className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center"
              title="Từ chối"
            >
              <PhoneOff className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={onAcceptIncoming}
              className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
              title="Nghe máy"
            >
              <Phone className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 ${zIndexClassName} bg-black/20 flex items-center justify-center`}>
      <div
        className={`rounded-2xl bg-white border border-gray-200 shadow-2xl p-5 ${isVideoCall ? 'w-[680px]' : 'w-[340px]'}`}
        style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
      >
        <div className="flex justify-end">
          <button
            onClick={onMinimize}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            title="Thu gọn cuộc gọi"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {isVideoCall ? (
          <>
            <div className="relative overflow-hidden rounded-xl bg-black h-[360px]">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover bg-black" />
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute bottom-3 right-3 w-40 h-28 object-cover rounded-lg border border-white/40 bg-gray-900"
              />
              {!hasRemoteStream && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Đang chờ video...</div>
              )}
            </div>
            <div className="mt-3 text-center">
              <p className="text-lg font-semibold text-gray-900">{user.name}</p>
              <p className="mt-1 text-sm text-gray-500">{callStatusText}</p>
            </div>
          </>
        ) : (
          <div className="text-center -mt-1">
            <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full object-cover mx-auto" />
            <p className="mt-3 text-lg font-semibold text-gray-900">{user.name}</p>
            <p className="mt-1 text-sm text-gray-500">{callStatusText}</p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={onToggleSpeaker}
            className={`w-12 h-12 rounded-full transition-colors flex items-center justify-center ${
              speakerMode === 'outer' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-100 hover:bg-gray-200'
            }`}
            title={speakerMode === 'outer' ? 'Đang loa ngoài, bấm để chuyển loa trong' : 'Đang loa trong, bấm để chuyển loa ngoài'}
          >
            {speakerMode === 'outer' ? (
              <Volume2 className="w-5 h-5 text-white" />
            ) : (
              <Volume1 className="w-5 h-5 text-gray-700" />
            )}
          </button>

          {isVideoCall && (
            <button
              onClick={onToggleCamera}
              className={`w-12 h-12 rounded-full transition-colors flex items-center justify-center ${
                isCameraEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              title={isCameraEnabled ? 'Tắt camera' : 'Bật camera'}
            >
              {isCameraEnabled ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-gray-700" />}
            </button>
          )}

          {callStatus === 'in_call' && (
            <button
              onClick={onToggleMute}
              className={`w-12 h-12 rounded-full transition-colors flex items-center justify-center ${
                isMuted ? 'bg-gray-100 hover:bg-gray-200' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              title={isMuted ? 'Bật mic' : 'Tắt mic'}
            >
              {isMuted ? <MicOff className="w-5 h-5 text-gray-700" /> : <Mic className="w-5 h-5 text-white" />}
            </button>
          )}

          <button
            onClick={onEndCall}
            className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center"
            title="Kết thúc cuộc gọi"
          >
            <PhoneOff className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

