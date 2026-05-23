import { Post } from '@/components/shared';
import type { ReactionType } from '@/services/postService';
import { SearchResultReel } from '../../types/search.types';

interface ReelResultProps {
  reel: SearchResultReel;
  onReactionChange?: (postId: string, reactionType: ReactionType | null) => void;
}

export const ReelResult = ({ reel, onReactionChange }: ReelResultProps) => {
  return (
    <Post
      id={reel.id}
      author={{ id: '', name: reel.author.name, avatar: reel.author.avatar }}
      timestamp={reel.timestamp ?? ''}
      content={reel.title ?? ''}
      media={reel.videoUrl ? { type: 'video' as const, url: reel.videoUrl } : undefined}
      image={!reel.videoUrl && reel.thumbnail ? reel.thumbnail : undefined}
      likes={reel.views ?? 0}
      comments={0}
      shares={0}
      isLiked={!!reel.userReactionType}
      currentUserReactionType={(reel.userReactionType as ReactionType) ?? null}
      onReactionChange={onReactionChange}
    />
  );
};
