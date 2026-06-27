import { Post } from '@/components/shared';
import type { ReactionType } from '@/services/postService';
import { SearchResultPost } from '../../types/search.types';

interface PostResultProps {
  post: SearchResultPost;
  onReactionChange?: (postId: string, reactionType: ReactionType | null) => void;
}

const isVideoUrl = (url?: string) =>
  !!url && (/\.(mp4|mov|webm|ogg)(\?|$)/i.test(url) || url.includes('/video/'));

export const PostResult = ({ post, onReactionChange }: PostResultProps) => {
  const videoSrc = post.video ?? (isVideoUrl(post.image) ? post.image : undefined);
  const imageSrc = videoSrc ? undefined : post.image;

  const group = post.groupId
    ? { id: post.groupId, name: post.author.groupName ?? 'Nhóm', icon: post.author.groupIconUrl ?? undefined }
    : undefined;

  const mediaList = (post.mediaItems ?? []).map(m => ({
    type: m.type as 'IMAGE' | 'VIDEO',
    url: m.url,
  }));

  return (
    <div className="h-full w-full">
      <Post
        id={post.id}
        author={{ id: post.author.id ?? '', name: post.author.name, avatar: post.author.avatar }}
        timestamp={post.timestamp}
        content={post.content}
        image={imageSrc}
        media={videoSrc ? { type: 'video' as const, url: videoSrc } : undefined}
        likes={post.likes ?? 0}
        comments={post.comments ?? 0}
        shares={post.shares ?? 0}
        isLiked={!!post.userReactionType}
        isSaved={post.savedByCurrentUser ?? false}
        currentUserReactionType={(post.userReactionType as ReactionType) ?? null}
        group={group}
        mediaList={mediaList}
        onReactionChange={onReactionChange}
        compact
        fillHeight
      />
    </div>
  );
};
