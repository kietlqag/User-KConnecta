import { Music, CheckCircle, Globe, Users, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatPostTimestamp } from '@/utils/postUtils';
import type { Reel } from '../../types/watch.types';

interface ReelOverlayProps {
  creator: {
    id: string;
    name: string;
    avatar: string;
    verified?: boolean;
  };
  caption: string;
  postedAt: string;
  privacy: Reel['privacy'];
  group?: Reel['group'];
  music?: {
    name: string;
    artist: string;
  };
}

const PRIVACY_META: Record<Reel['privacy'], { label: string; Icon: typeof Globe }> = {
  PUBLIC: { label: 'Công khai', Icon: Globe },
  FRIENDS: { label: 'Bạn bè', Icon: Users },
  FRIENDS_EXCEPT: { label: 'Bạn bè', Icon: Users },
  SPECIFIC_FRIENDS: { label: 'Bạn bè', Icon: Users },
  PRIVATE: { label: 'Chỉ mình tôi', Icon: Lock },
};

export const ReelOverlay = ({ creator, caption, postedAt, privacy, group, music }: ReelOverlayProps) => {
  const { label: privacyLabel, Icon: PrivacyIcon } = PRIVACY_META[privacy] ?? PRIVACY_META.PUBLIC;
  const postedAtLabel = formatPostTimestamp(postedAt);
  const navigate = useNavigate();
  const goToProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${creator.id}`);
  };
  const goToGroup = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (group) navigate(`/groups/${group.id}`);
  };
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-6 pt-24">
      {/* Creator Info */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-shrink-0">
          <img
            src={group ? group.icon || creator.avatar : creator.avatar}
            alt={group ? group.name : creator.name}
            onClick={group ? goToGroup : goToProfile}
            className={`w-12 h-12 object-cover border-2 border-white cursor-pointer hover:opacity-90 transition-opacity ${group ? 'rounded-lg' : 'rounded-full'}`}
          />
          {group && (
            <img
              src={creator.avatar}
              alt={creator.name}
              onClick={goToProfile}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-white object-cover cursor-pointer"
            />
          )}
        </div>

        {group ? (
          <div className="min-w-0">
            <h3
              onClick={goToGroup}
              className="font-semibold text-white text-lg cursor-pointer hover:underline leading-tight truncate"
            >
              {group.name}
            </h3>
            <div className="flex items-center gap-1.5 text-white/90 text-sm leading-tight">
              <span onClick={goToProfile} className="cursor-pointer hover:underline truncate">
                {creator.name}
              </span>
              {creator.verified && (
                <CheckCircle className="w-4 h-4 text-blue-500 fill-blue-500 flex-shrink-0" />
              )}
              <span>·</span>
              <PrivacyIcon className="w-3.5 h-3.5 text-white/80 flex-shrink-0" aria-label={privacyLabel}>
                <title>{privacyLabel}</title>
              </PrivacyIcon>
              <span>·</span>
              <span className="text-white/70 shrink-0">{postedAtLabel}</span>
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3
                onClick={goToProfile}
                className="font-semibold text-white text-lg cursor-pointer hover:underline truncate"
              >
                {creator.name}
              </h3>
              {creator.verified && (
                <CheckCircle className="w-5 h-5 text-blue-500 fill-blue-500 shrink-0" />
              )}
              <PrivacyIcon
                className="w-4 h-4 text-white/80 shrink-0"
                aria-label={privacyLabel}
              >
                <title>{privacyLabel}</title>
              </PrivacyIcon>
            </div>
            <p className="mt-0.5 text-xs text-white/70">{postedAtLabel}</p>
          </div>
        )}
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
