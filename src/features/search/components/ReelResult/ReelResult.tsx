import { Play, Eye } from 'lucide-react';
import { SearchResultReel } from '../../types/search.types';

interface ReelResultProps {
  reel: SearchResultReel;
}

export const ReelResult = ({ reel }: ReelResultProps) => {
  const formatViews = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
    return count.toString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow group cursor-pointer">
      {/* Thumbnail */}
      <div className="relative w-full aspect-[9/16] max-h-64 bg-gray-900 overflow-hidden">
        <img
          src={reel.thumbnail}
          alt={reel.title || 'Reel'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-medium">
          {reel.duration}
        </div>
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        {reel.title && (
          <p className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2">
            {reel.title}
          </p>
        )}
        <div className="flex items-center gap-2">
          <img
            src={reel.author.avatar}
            alt={reel.author.name}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">{reel.author.name}</p>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <Eye className="w-3 h-3" />
              <span>{formatViews(reel.views)} lượt xem</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
