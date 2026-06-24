import { Play } from 'lucide-react';
import { UserAvatar } from '@/components/shared';
import { SearchResultReel } from '../../types/search.types';

interface ReelResultProps {
  reel: SearchResultReel;
  onPlay: (reelId: string) => void;
}

export const ReelResult = ({ reel, onPlay }: ReelResultProps) => {
  return (
    <button
      type="button"
      onClick={() => onPlay(reel.id)}
      className="group relative aspect-[9/16] w-full cursor-pointer overflow-hidden rounded-xl bg-gray-900 text-left"
    >
      {reel.videoUrl ? (
        <video
          src={reel.videoUrl}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          muted
          preload="metadata"
        />
      ) : reel.thumbnail ? (
        <img src={reel.thumbnail} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-800">
          <Play className="h-10 w-10 text-white/70" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="mb-2 flex items-center gap-2">
          <UserAvatar
            name={reel.author.name}
            avatarUrl={reel.author.avatar}
            className="h-8 w-8 shrink-0"
            rounded="full"
          />
          <span className="truncate text-sm font-semibold text-white">{reel.author.name}</span>
        </div>
        {reel.title ? (
          <p className="line-clamp-2 text-xs leading-snug text-white/90">{reel.title}</p>
        ) : null}
      </div>

      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
        <div className="rounded-full bg-black/40 p-3">
          <Play className="h-6 w-6 fill-white text-white" />
        </div>
      </div>
    </button>
  );
};
