import { useState } from 'react';
import { Maximize, Minimize, Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react';

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const safe = Math.floor(seconds);
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
  /** Mốc đã tải sẵn (xem trước) để vẽ vạch buffer mờ phía sau. Mặc định = bufferedSeconds. */
  loadedSeconds?: number;
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
  /** Âm lượng 0..1. Khi có cùng onVolumeChange sẽ hiện thanh trượt âm lượng. */
  volume?: number;
  onVolumeChange?: (value: number) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
};

export function LiveViewerScrubBar({
  bufferedSeconds,
  playbackSeconds,
  loadedSeconds,
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
  volume = 1,
  onVolumeChange,
  isFullscreen = false,
  onToggleFullscreen,
}: LiveViewerScrubBarProps) {
  const isReplay = mode === 'replay';
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const max = Math.max(bufferedSeconds, 1);
  const progressPercent = bufferedSeconds > 0 ? Math.min(100, (playbackSeconds / max) * 100) : 0;
  const loadedPercent = bufferedSeconds > 0
    ? Math.min(100, (Math.max(loadedSeconds ?? bufferedSeconds, playbackSeconds) / max) * 100)
    : 0;
  // Nhãn thời gian cộng offset để hiển thị giờ thật của buổi live; slider vẫn
  // chạy theo toạ độ local (0..bufferedSeconds) nên logic seek không đổi.
  const displayPlayback = playbackSeconds + displayOffsetSeconds;
  const displayBuffered = bufferedSeconds + displayOffsetSeconds;
  // Live edge: vạch đỏ; đã tua / replay: vạch trắng.
  const isLiveActive = !isReplay && isAtLiveEdge;
  const fillColor = isLiveActive ? 'bg-red-500' : 'bg-white';
  const thumbColor = isLiveActive ? 'bg-red-500' : 'bg-white';
  const showThumb = isScrubbing || isHovering;
  const effectiveVolume = isMuted ? 0 : volume;
  const VolumeIcon = effectiveVolume <= 0 ? VolumeX : effectiveVolume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className={`select-none transition-opacity duration-200 ${ showControls ? 'opacity-100' : 'pointer-events-none opacity-0' }`}
    >
      <div className="flex items-center gap-2">
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
            className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold text-white transition hover:bg-white/10"
            aria-label="Về trực tiếp"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${isLiveActive ? 'bg-red-500' : 'bg-white/50'} ${isLiveActive ? 'animate-pulse' : ''}`} />
            Trực tiếp
          </button>
        )}

        <span className="ml-1 shrink-0 text-xs font-medium tabular-nums text-white/90">
          {formatDuration(displayPlayback)}
        </span>

        <div
          className="group/track relative flex h-5 flex-1 cursor-pointer items-center"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Track nền + buffered + fill: nở dày khi hover/scrub */}
          <div
            className={`absolute inset-x-0 overflow-hidden rounded-full bg-white/25 transition-[height] duration-150 ${ showThumb ? 'h-[5px]' : 'h-[3px]' }`}
          >
            <div className="absolute inset-y-0 left-0 bg-white/35" style={{ width: `${loadedPercent}%` }} />
            <div
              className={`absolute inset-y-0 left-0 ${fillColor} ${isScrubbing ? '' : 'transition-[width] duration-200 ease-linear'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Núm kéo: ẩn khi rảnh, hiện khi hover/scrub (chuẩn Facebook) */}
          <span
            className={`pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full ${thumbColor} shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_1px_4px_rgba(0,0,0,0.5)] transition-transform duration-150 ${ showThumb ? 'scale-100' : 'scale-0' }`}
            style={{ left: `${progressPercent}%` }}
            aria-hidden
          />
          {/* Bong bóng thời gian khi hover/scrub */}
          {showThumb && canScrub && (
            <span
              className="pointer-events-none absolute -top-9 -translate-x-1/2 rounded-md bg-black/90 px-2 py-1 text-xs font-semibold tabular-nums text-white shadow-lg"
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
          {formatDuration(displayBuffered)}
        </span>

        {/* Âm lượng: nút mute + thanh trượt hiện khi hover (chuẩn Facebook) */}
        <div className="group/vol flex shrink-0 items-center">
          <button
            type="button"
            onClick={onToggleMute}
            className="rounded-full p-1.5 text-white transition hover:bg-white/15"
            aria-label={effectiveVolume <= 0 ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            <VolumeIcon className="h-5 w-5" />
          </button>
          {onVolumeChange && (
            <div className="w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover/vol:ml-1 group-hover/vol:w-16 group-hover/vol:opacity-100">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={effectiveVolume}
                aria-label="Âm lượng"
                onChange={(event) => onVolumeChange(Number(event.target.value))}
                className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/30 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white"
                style={{
                  background: `linear-gradient(to right, #fff ${effectiveVolume * 100}%, rgba(255,255,255,0.3) ${effectiveVolume * 100}%)`,
                }}
              />
            </div>
          )}
        </div>

        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="shrink-0 rounded-full p-1.5 text-white transition hover:bg-white/15"
            aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        )}
      </div>
    </div>
  );
}
