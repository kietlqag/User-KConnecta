import { useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

type LiveViewerScrubBarProps = {
  bufferedSeconds: number;
  playbackSeconds: number;
  displayOffsetSeconds?: number;
  isAtLiveEdge: boolean;
  canScrub: boolean;
  isMuted: boolean;
  showControls: boolean;
  onSeek: (seconds: number) => void;
  onSeekStart: () => void;
  onSeekEnd: (seconds: number) => void;
  onGoLive: () => void;
  onToggleMute: () => void;
  fullSession?: boolean;
  mode?: 'live' | 'replay';
  isPaused?: boolean;
  onTogglePlay?: () => void;
};

export function LiveViewerScrubBar({
  bufferedSeconds,
  playbackSeconds,
  displayOffsetSeconds = 0,
  isAtLiveEdge,
  canScrub,
  isMuted,
  showControls,
  onSeek,
  onSeekStart,
  onSeekEnd,
  onGoLive,
  onToggleMute,
  fullSession = false,
  mode = 'live',
  isPaused = false,
  onTogglePlay,
}: LiveViewerScrubBarProps) {
  const isReplay = mode === 'replay';
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const max = Math.max(bufferedSeconds, 1);
  const progressPercent = bufferedSeconds > 0 ? Math.min(100, (playbackSeconds / max) * 100) : 0;
  // Nhãn thời gian cộng offset để hiển thị giờ thật của buổi live; slider vẫn
  // chạy theo toạ độ local (0..bufferedSeconds) nên logic seek không đổi.
  const displayPlayback = playbackSeconds + displayOffsetSeconds;
  const displayBuffered = bufferedSeconds + displayOffsetSeconds;
  // Live edge: vạch đỏ; đã tua / replay: vạch trắng.
  const isLiveActive = !isReplay && isAtLiveEdge;
  const fillColor = isLiveActive ? 'bg-red-500' : 'bg-white';
  const showBubble = (isScrubbing || isHovering) && canScrub;

  return (
    <div
      className={`mb-2 transition-opacity duration-200 ${ showControls ? 'opacity-100' : 'pointer-events-none opacity-0' }`}
    >
      <div className="flex items-center gap-3">
        {(isReplay || onTogglePlay) && (
          <button
            type="button"
            onClick={onTogglePlay}
            className="shrink-0 rounded-full p-1.5 text-white transition hover:bg-white/15"
            aria-label={isPaused ? 'Phát' : 'Tạm dừng'}
          >
            {isPaused ? <Play className="h-5 w-5 fill-current" /> : <Pause className="h-5 w-5 fill-current" />}
          </button>
        )}

        {!isReplay && (
          <button
            type="button"
            onClick={onGoLive}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-1.5 py-0.5 text-sm font-semibold text-white transition hover:bg-white/10"
            aria-label="Về trực tiếp"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${isLiveActive ? 'bg-red-500' : 'bg-white/50'} ${isLiveActive ? 'animate-pulse' : ''}`} />
            Trực tiếp
          </button>
        )}

        <span className="shrink-0 text-xs font-medium tabular-nums text-white/90">
          {formatDuration(displayPlayback)}
        </span>

        <div
          className="group relative flex h-5 flex-1 items-center"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Track nền */}
          <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/25" />
          {/* Phần đã phát */}
          <div
            className={`absolute h-1.5 rounded-full ${fillColor} ${isScrubbing ? '' : 'transition-[width] duration-200 ease-linear'}`}
            style={{ width: `${progressPercent}%` }}
          />
          {/* Núm kéo */}
          {canScrub && (
            <span
              className={`pointer-events-none absolute h-4 w-4 -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25),0_1px_3px_rgba(0,0,0,0.5)] transition-transform ${ showBubble ? 'scale-110' : 'scale-100' }`}
              style={{ left: `${progressPercent}%` }}
              aria-hidden
            />
          )}
          {/* Bong bóng thời gian */}
          {showBubble && (
            <span
              className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded-md bg-black/85 px-2 py-1 text-xs font-semibold tabular-nums text-white shadow-lg"
              style={{ left: `${progressPercent}%` }}
              aria-hidden
            >
              {formatDuration(displayPlayback)}
            </span>
          )}
          <input
            type="range"
            min={0}
            max={max}
            step={0.25}
            value={Math.min(playbackSeconds, max)}
            disabled={!canScrub}
            aria-label={isReplay ? 'Thanh tua phát lại live' : 'Thanh tua live'}
            aria-valuemin={0}
            aria-valuemax={bufferedSeconds}
            aria-valuenow={playbackSeconds}
            aria-valuetext={`${formatDuration(displayPlayback)} trên ${formatDuration(displayBuffered)}`}
            onPointerDown={() => { setIsScrubbing(true); onSeekStart(); }}
            onChange={(event) => onSeek(Number(event.target.value))}
            onPointerUp={(event) => { setIsScrubbing(false); onSeekEnd(Number(event.currentTarget.value)); }}
            className="absolute inset-x-0 z-10 h-5 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-default [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-transparent [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent"
          />
        </div>

        <span className="shrink-0 text-xs font-medium tabular-nums text-white/70">
          {isLiveActive ? formatDuration(displayBuffered) : `${formatDuration(displayBuffered)}`}
        </span>

        <button
          type="button"
          onClick={onToggleMute}
          className="shrink-0 rounded-full p-1.5 text-white transition hover:bg-white/15"
          aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
