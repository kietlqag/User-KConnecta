import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { ChevronLeft, ChevronRight, Mic, MicOff, Phone, PhoneOff, Video, VideoOff, Volume1, Volume2, X } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import type { GroupCallParticipant } from '../../types/message.types';

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
  localStream?: MediaStream | null;
  groupCallParticipants?: GroupCallParticipant[];
  remoteStreams?: Array<{ userId: string; stream: MediaStream }>;
  currentUserId?: string;
  callerUserId?: string | null;
  zIndexClassName?: string;
  onMinimize: () => void;
  onRejectIncoming?: () => void;
  onAcceptIncoming?: () => void;
  onToggleSpeaker?: () => void;
  onToggleCamera?: () => void;
  onToggleMute?: () => void;
  onEndCall?: () => void;
}

function statusLabel(status: GroupCallParticipant['status']) {
  switch (status) {
    case 'joined':
      return 'Đang trong cuộc gọi';
    case 'left':
      return 'Đã rời khỏi';
    case 'rejected':
      return 'Đã từ chối';
    case 'missed':
      return 'Chưa tham gia';
    case 'ringing':
      return 'Đang gọi...';
    default:
      return 'Được mời';
  }
}

function GroupVideoTile({
  participant,
  stream,
  isSelf,
}: {
  participant: GroupCallParticipant;
  stream?: MediaStream;
  isSelf?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream ?? null;
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [stream]);

  const joined = participant.status === 'joined';
  return (
    <div className="relative min-h-[150px] overflow-hidden rounded-xl bg-gray-950">
      {stream && joined && participant.cameraEnabled ? (
        <video ref={videoRef} autoPlay muted={isSelf} playsInline className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full min-h-[150px] flex-col items-center justify-center gap-2 bg-gray-100 dark:bg-background">
          <img src={participant.avatar} alt={participant.name} className="h-16 w-16 rounded-full object-cover" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{joined ? 'Đang chờ video' : statusLabel(participant.status)}</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/55 px-3 py-2 text-white">
        <span className="truncate text-sm font-semibold">{participant.name}</span>
        <div className="flex items-center gap-1">
          {participant.micEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
          {participant.cameraEnabled ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
        </div>
      </div>
    </div>
  );
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
  localStream,
  groupCallParticipants = [],
  remoteStreams = [],
  currentUserId,
  callerUserId,
  zIndexClassName = 'z-[130]',
  onMinimize,
  onRejectIncoming,
  onAcceptIncoming,
  onToggleSpeaker,
  onToggleCamera,
  onToggleMute,
  onEndCall,
}: CallOverlayModalProps) {
  const isGroupCall = groupCallParticipants.length > 0;
  const caller = callerUserId ? groupCallParticipants.find((participant) => participant.userId === callerUserId) : undefined;
  const joinedParticipants = groupCallParticipants.filter((participant) => participant.status === 'joined');
  const videoPageSize = 4;
  const [videoPage, setVideoPage] = useState(0);
  const videoParticipants = useMemo(
    () => groupCallParticipants.filter((participant) => participant.status === 'joined'),
    [groupCallParticipants],
  );
  const videoPageCount = Math.max(1, Math.ceil(videoParticipants.length / videoPageSize));
  const visibleVideoParticipants = videoParticipants.slice(
    videoPage * videoPageSize,
    videoPage * videoPageSize + videoPageSize,
  );
  const centeredGroupGridClass =
    visibleVideoParticipants.length <= 1
      ? 'grid-cols-1 max-w-[360px]'
      : visibleVideoParticipants.length === 2
        ? 'grid-cols-1 sm:grid-cols-2 max-w-[620px]'
        : 'grid-cols-1 sm:grid-cols-2 max-w-[620px]';

  useEffect(() => {
    setVideoPage((prev) => Math.min(prev, videoPageCount - 1));
  }, [videoPageCount]);

  if (!show) return null;

  const isWideLayout = mode === 'ongoing' && (isVideoCall || isGroupCall);
  const cardClassName = `relative rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl p-6 ${
    isWideLayout ? 'w-[min(760px,calc(100vw-32px))]' : 'w-[min(408px,calc(100vw-32px))]'
  }`;
  const iconButtonClassName = 'w-14 h-14 rounded-full transition-colors flex items-center justify-center';
  const closeButton = (
    <button
      onClick={onMinimize}
      className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted cursor-pointer"
      title="Thu gọn cuộc gọi"
    >
      <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
    </button>
  );

  const groupParticipantList = (
    <div className="mt-5 max-h-52 overflow-y-auto pr-1">
      <p className="mb-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Thành viên cuộc gọi</p>
      <div className="space-y-2">
        {groupCallParticipants.map((participant) => (
          <div key={participant.userId} className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-900 px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <img src={participant.avatar} alt={participant.name} className="h-10 w-10 rounded-full object-cover" />
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {participant.name}
                  {participant.userId === currentUserId ? ' (Bạn)' : ''}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{participant.userId === callerUserId ? 'Người bắt đầu cuộc gọi' : statusLabel(participant.status)}</p>
              </div>
            </div>
            <span className={`h-2.5 w-2.5 rounded-full ${participant.status === 'joined' ? 'bg-green-500' : participant.status === 'ringing' ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
          </div>
        ))}
      </div>
    </div>
  );

  const groupPageControls = videoParticipants.length > videoPageSize && (
    <div className="mt-3 flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => setVideoPage((prev) => Math.max(0, prev - 1))}
        disabled={videoPage === 0} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        title="Trang trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {videoPage + 1}/{videoPageCount}
      </span>
      <button
        type="button"
        onClick={() => setVideoPage((prev) => Math.min(videoPageCount - 1, prev + 1))}
        disabled={videoPage >= videoPageCount - 1} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        title="Trang sau"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );

  if (mode === 'incoming') {
    return (
      <div className={`fixed inset-0 ${zIndexClassName} flex items-center justify-center bg-black/20 p-4`}>
        <div className={cardClassName} style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}>
          {closeButton}

          <div className="pt-8 text-center">
            <UserAvatar name={user.name} avatarUrl={user.avatar} rounded="full" className="mx-auto h-24 w-24" />
            <p className="mt-5 text-[22px] font-semibold leading-tight text-gray-900 dark:text-gray-100">{user.name}</p>
            <p className="mt-2 text-[16px] text-gray-500 dark:text-gray-400">
              {isGroupCall
                ? `${caller?.name || user.name} đang gọi nhóm`
                : incomingMediaType === 'video'
                  ? 'Đang gọi video cho bạn'
                  : 'Đang gọi thoại cho bạn'}
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-7">
            <button onClick={onRejectIncoming} className={`${`${iconButtonClassName} cursor-pointer` } bg-red-500 hover:bg-red-600`} title="Từ chối">
              <PhoneOff className="h-6 w-6 text-white" />
            </button>
            <button onClick={onAcceptIncoming} className={`${`${iconButtonClassName} cursor-pointer` } bg-green-500 hover:bg-green-600`} title="Nghe máy">
              <Phone className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderGroupCallBody = () => {
    if (!isGroupCall) return null;
    if (isVideoCall) {
      return (
        <>
          <div className={`mx-auto mt-7 grid max-h-[380px] w-full ${centeredGroupGridClass} gap-3 overflow-y-auto`}>
            {visibleVideoParticipants.map((participant) => (
              <GroupVideoTile
                key={participant.userId}
                participant={participant}
                stream={participant.userId === currentUserId ? localStream ?? undefined : remoteStreams.find((item) => item.userId === participant.userId)?.stream}
                isSelf={participant.userId === currentUserId}
              />
            ))}
          </div>
          {videoParticipants.length > videoPageSize && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setVideoPage((prev) => Math.max(0, prev - 1))}
                disabled={videoPage === 0} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                title="Trang trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {videoPage + 1}/{videoPageCount}
              </span>
              <button
                type="button"
                onClick={() => setVideoPage((prev) => Math.min(videoPageCount - 1, prev + 1))}
                disabled={videoPage >= videoPageCount - 1} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                title="Trang sau"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="mt-3 text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{videoParticipants.length} người đang trong cuộc gọi</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{callStatusText}</p>
          </div>
        </>
      );
    }
    return (
      <div className="pt-7 text-center">
        <div className={`mx-auto grid w-full ${centeredGroupGridClass} gap-3`}>
          {visibleVideoParticipants.map((participant) => (
            <div key={participant.userId} className="rounded-xl bg-gray-50 dark:bg-gray-900 px-2 py-3">
              <img src={participant.avatar} alt={participant.name} className="mx-auto h-16 w-16 rounded-full object-cover" />
              <p className="mt-2 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{participant.name}</p>
              <p className="text-xs text-green-600">Đã tham gia</p>
            </div>
          ))}
        </div>
        {groupPageControls}
        <p className="mt-4 text-[16px] text-gray-500 dark:text-gray-400">{callStatusText}</p>
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 ${zIndexClassName} flex items-center justify-center bg-black/20 p-4`}>
      <div className={cardClassName} style={{ fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif' }}>
        {closeButton}

        {isGroupCall ? (
          renderGroupCallBody()
        ) : isVideoCall ? (
          <>
            <div className="mt-7 relative overflow-hidden rounded-xl bg-black h-[360px]">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover bg-black" />
              <video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-3 right-3 w-40 h-28 object-cover rounded-lg border border-white/40 bg-gray-900" />
              {!hasRemoteStream && <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Đang chờ video...</div>}
            </div>
            <div className="mt-3 text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{user.name}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{callStatusText}</p>
            </div>
          </>
        ) : (
          <div className="pt-8 text-center">
            <UserAvatar name={user.name} avatarUrl={user.avatar} rounded="full" className="mx-auto h-24 w-24" />
            <p className="mt-5 text-[22px] font-semibold leading-tight text-gray-900 dark:text-gray-100">{user.name}</p>
            <p className="mt-2 text-[16px] text-gray-500 dark:text-gray-400">{callStatusText}</p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-7">
          <button
            onClick={onToggleSpeaker}
            className={`${`${iconButtonClassName} cursor-pointer` } ${speakerMode === 'outer' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            title={speakerMode === 'outer' ? 'Đang loa ngoài, bấm để chuyển loa trong' : 'Đang loa trong, bấm để chuyển loa ngoài'}
          >
            {speakerMode === 'outer' ? <Volume2 className="h-6 w-6 text-white" /> : <Volume1 className="h-6 w-6 text-gray-700 dark:text-gray-300" />}
          </button>

          {isVideoCall && (
            <button
              onClick={onToggleCamera}
              className={`${`${iconButtonClassName} cursor-pointer` } ${isCameraEnabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              title={isCameraEnabled ? 'Tắt camera' : 'Bật camera'}
            >
              {isCameraEnabled ? <Video className="h-6 w-6 text-white" /> : <VideoOff className="h-6 w-6 text-gray-700 dark:text-gray-300" />}
            </button>
          )}

          {callStatus === 'in_call' && (
            <button
              onClick={onToggleMute}
              className={`${`${iconButtonClassName} cursor-pointer` } ${isMuted ? 'bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              title={isMuted ? 'Bật mic' : 'Tắt mic'}
            >
              {isMuted ? <MicOff className="h-6 w-6 text-gray-700 dark:text-gray-300" /> : <Mic className="h-6 w-6 text-white" />}
            </button>
          )}

          <button onClick={onEndCall} className={`${`${iconButtonClassName} cursor-pointer` } bg-red-500 hover:bg-red-600`} title="Kết thúc cuộc gọi">
            <PhoneOff className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

