import { Volume2, VolumeX } from 'lucide-react';

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
};

export function LiveViewerScrubBar({
  bufferedSeconds,
  playbackSeconds,
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
}: LiveViewerScrubBarProps) {
  const max = Math.max(bufferedSeconds, 1);
  const progressPercent = bufferedSeconds > 0 ? Math.min(100, (playbackSeconds / max) * 100) : 0;

  return (
    <div
      className={`mb-3 space-y-1 transition-opacity duration-200 ${
        showControls ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="w-11 shrink-0 text-xs tabular-nums text-white/90">
          {formatDuration(playbackSeconds)}
        </span>

        <div className="relative h-4 flex-1 touch-none">
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/25" />
          <div
            className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white transition-[width] duration-300 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
          {isAtLiveEdge && bufferedSeconds > 0 && (
            <span
              className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(0,0,0,0.35)]"
              style={{ left: `calc(${progressPercent}% - 5px)` }}
              aria-hidden
            />
          )}
          <input
            type="range"
            min={0}
            max={max}
            step={0.25}
            value={Math.min(playbackSeconds, max)}
            disabled={!canScrub}
            aria-label="Thanh tua live"
            aria-valuemin={0}
            aria-valuemax={bufferedSeconds}
            aria-valuenow={playbackSeconds}
            aria-valuetext={`${formatDuration(playbackSeconds)} trên ${formatDuration(bufferedSeconds)}`}
            onPointerDown={onSeekStart}
            onChange={(event) => onSeek(Number(event.target.value))}
            onPointerUp={(event) => onSeekEnd(Number(event.currentTarget.value))}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none bg-transparent disabled:cursor-default [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white"
          />
        </div>

        {!isAtLiveEdge && canScrub && (
          <button
            type="button"
            onClick={onGoLive}
            className="shrink-0 rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-red-500"
          >
            Live
          </button>
        )}

        <button
          type="button"
          onClick={onToggleMute}
          className="shrink-0 rounded-full p-1 hover:bg-white/10"
          aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          {isMuted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
        </button>
      </div>

      <p className="text-[11px] text-white/55">
        {fullSession
          ? isAtLiveEdge
            ? 'Đang xem trực tiếp · kéo thanh để tua từ đầu buổi live'
            : `Đang tua lại · ${formatDuration(bufferedSeconds)} buổi live`
          : isAtLiveEdge
            ? bufferedSeconds > 0
              ? 'Đang xem trực tiếp · kéo thanh để tua lại'
              : 'Đang ghi buffer để tua lại...'
            : `Đang tua lại · ${formatDuration(bufferedSeconds)} đã ghi`}
      </p>
    </div>
  );
}
