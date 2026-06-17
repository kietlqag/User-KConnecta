import type { PostResponse } from '@/services/postService';
import type { Reel } from '../types/watch.types';

function isVideoUrl(url?: string | null): boolean {
  if (!url?.trim()) return false;
  const u = url.trim();
  return (
    u.includes('/video/') ||
    u.includes('resource_type=video') ||
    /\.(mp4|mov|webm|m4v|ogg)(\?.*)?$/i.test(u)
  );
}

function resolveVideoUrl(post: PostResponse): string | null {
  const videoMedia = post.media?.find((m) => m.mediaType === 'VIDEO');
  if (videoMedia) {
    return videoMedia.mediaUrl || videoMedia.fileUrl || null;
  }
  const fromMedia = post.media?.find((m) => isVideoUrl(m.mediaUrl || m.fileUrl));
  if (fromMedia) {
    return fromMedia.mediaUrl || fromMedia.fileUrl || null;
  }
  const legacy = post.imageUrl?.trim();
  if (legacy && isVideoUrl(legacy)) {
    return legacy;
  }
  return null;
}

export function mapPostToReel(post: PostResponse): Reel | null {
  const videoUrl = resolveVideoUrl(post);
  if (!videoUrl) return null;

  const fallbackAvatar = `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(post.authorFullName || 'User')}`;

  return {
    id: post.id,
    videoUrl,
    thumbnail: videoUrl,
    creator: {
      id: post.authorId,
      name: post.authorFullName,
      avatar: post.authorAvatarUrl || fallbackAvatar,
    },
    caption: post.content || '',
    privacy: post.privacy,
    group: post.groupId
      ? { id: post.groupId, name: post.groupName ?? 'Nhóm', icon: post.groupIconUrl ?? undefined }
      : undefined,
    music: {
      name: 'Âm thanh gốc',
      artist: post.authorFullName,
    },
    likes: post.reactionCount,
    comments: post.commentCount,
    shares: post.shareCount,
    views: 0,
    duration: 0,
    isLiked: !!post.currentUserReactionType,
    currentUserReactionType: post.currentUserReactionType ?? null,
    isSaved: post.savedByCurrentUser ?? false,
  };
}

export function mapPostsToReels(posts: PostResponse[]): Reel[] {
  return posts.map(mapPostToReel).filter((r): r is Reel => r !== null);
}
