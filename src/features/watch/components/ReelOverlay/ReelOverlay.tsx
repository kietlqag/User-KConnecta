import { Music, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReelOverlayProps {
  creator: {
    id: string;
    name: string;
    avatar: string;
    verified?: boolean;
  };
  caption: string;
  music?: {
    name: string;
    artist: string;
  };
}

export const ReelOverlay = ({ creator, caption, music }: ReelOverlayProps) => {
  const navigate = useNavigate();
  const goToProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${creator.id}`);
  };
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-6 pt-24">
      {/* Creator Info */}
      <div className="flex items-center gap-3 mb-3">
        <img
          src={creator.avatar}
          alt={creator.name}
          onClick={goToProfile}
          className="w-12 h-12 rounded-full object-cover border-2 border-white cursor-pointer hover:opacity-90 transition-opacity"
        />
        <div className="flex items-center gap-2">
          <h3
            onClick={goToProfile}
            className="font-semibold text-white text-lg cursor-pointer hover:underline"
          >
            {creator.name}
          </h3>
          {creator.verified && (
            <CheckCircle className="w-5 h-5 text-blue-500 fill-blue-500" />
          )}
        </div>
        <button className="ml-2 px-6 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full transition-colors cursor-pointer">
          Theo dõi
        </button>
      </div>

      {/* Caption */}
      <p className="text-white text-sm mb-3 line-clamp-2">
        {caption}
      </p>

      {/* Music Info */}
      {music && (
        <div className="flex items-center gap-2 text-white/90">
          <Music className="w-4 h-4" />
          <span className="text-sm font-medium">
            {music.name} · {music.artist}
          </span>
        </div>
      )}
    </div>
  );
};
