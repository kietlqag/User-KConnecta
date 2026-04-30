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

  const isWideVideoLayout = mode === 'ongoing' && isVideoCall;
  const cardClassName = `relative rounded-2xl bg-white border border-gray-200 shadow-2xl p-6 ${
    isWideVideoLayout ? 'w-[min(680px,calc(100vw-32px))]' : 'w-[min(408px,calc(100vw-32px))]'
  }`;
  const iconButtonClassName = 'w-14 h-14 rounded-full transition-colors flex items-center justify-center';
  const closeButton = (
    <button
      onClick={onMinimize}
      className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
      title="Thu gọn cuộc gọi"
    >
      <X className="h-4 w-4 text-gray-600" />
    </button>
  );

  if (mode === 'incoming') {
    return (
      <div className={`fixed inset-0 ${zIndexClassName} flex items-center justify-center bg-black/20 p-4`}>
        <div
          className={cardClassName}
          style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
        >
          {closeButton}

          <div className="pt-8 text-center">
            <img src={user.avatar} alt={user.name} className="mx-auto h-24 w-24 rounded-full object-cover" />
            <p className="mt-5 text-[22px] font-semibold leading-tight text-gray-900">{user.name}</p>
            <p className="mt-2 text-[16px] text-gray-500">
              {incomingMediaType === 'video' ? 'Đang gọi video cho bạn' : 'Đang gọi thoại cho bạn'}
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-7">
            <button
              onClick={onRejectIncoming}
              className={`${iconButtonClassName} bg-red-500 hover:bg-red-600`}
              title="Từ chối"
            >
              <PhoneOff className="h-6 w-6 text-white" />
            </button>
            <button
              onClick={onAcceptIncoming}
              className={`${iconButtonClassName} bg-green-500 hover:bg-green-600`}
              title="Nghe máy"
            >
              <Phone className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 ${zIndexClassName} flex items-center justify-center bg-black/20 p-4`}>
      <div
        className={cardClassName}
        style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}
      >
        {closeButton}

        {isVideoCall ? (
          <>
            <div className="mt-7 relative overflow-hidden rounded-xl bg-black h-[360px]">
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
          <div className="pt-8 text-center">
            <img src={user.avatar} alt={user.name} className="mx-auto h-24 w-24 rounded-full object-cover" />
            <p className="mt-5 text-[22px] font-semibold leading-tight text-gray-900">{user.name}</p>
            <p className="mt-2 text-[16px] text-gray-500">{callStatusText}</p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-7">
          <button
            onClick={onToggleSpeaker}
            className={`${iconButtonClassName} ${
              speakerMode === 'outer' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-100 hover:bg-gray-200'
            }`}
            title={speakerMode === 'outer' ? 'Đang loa ngoài, bấm để chuyển loa trong' : 'Đang loa trong, bấm để chuyển loa ngoài'}
          >
            {speakerMode === 'outer' ? (
              <Volume2 className="h-6 w-6 text-white" />
            ) : (
              <Volume1 className="h-6 w-6 text-gray-700" />
            )}
          </button>

          {isVideoCall && (
            <button
              onClick={onToggleCamera}
              className={`${iconButtonClassName} ${
                isCameraEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              title={isCameraEnabled ? 'Tắt camera' : 'Bật camera'}
            >
              {isCameraEnabled ? <Video className="h-6 w-6 text-white" /> : <VideoOff className="h-6 w-6 text-gray-700" />}
            </button>
          )}

          {callStatus === 'in_call' && (
            <button
              onClick={onToggleMute}
              className={`${iconButtonClassName} ${
                isMuted ? 'bg-gray-100 hover:bg-gray-200' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              title={isMuted ? 'Bật mic' : 'Tắt mic'}
            >
              {isMuted ? <MicOff className="h-6 w-6 text-gray-700" /> : <Mic className="h-6 w-6 text-white" />}
            </button>
          )}

          <button
            onClick={onEndCall}
            className={`${iconButtonClassName} bg-red-500 hover:bg-red-600`}
            title="Kết thúc cuộc gọi"
          >
            <PhoneOff className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

