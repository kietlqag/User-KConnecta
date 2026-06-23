import type { PostResponse } from '@/services/postService';
import type { Reel } from '../types/watch.types';
import { isVideoUrl } from '@/utils/mediaUtils';

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

function resolveThumbnailUrl(post: PostResponse, videoUrl: string): string {
  const videoMedia = post.media?.find((m) => m.mediaType === 'VIDEO');
  if (videoMedia?.thumbnailUrl?.trim()) {
    return videoMedia.thumbnailUrl.trim();
  }
  return videoUrl;
}

export function mapPostToReel(post: PostResponse): Reel | null {
  const videoUrl = resolveVideoUrl(post);
  if (!videoUrl) return null;

  const fallbackAvatar = `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(post.authorFullName || 'User')}`;

  return {
    id: post.id,
    videoUrl,
    thumbnail: resolveThumbnailUrl(post, videoUrl),
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
    postedAt: post.publishedAt || post.createdAt,
    isLiked: !!post.currentUserReactionType,
    currentUserReactionType: post.currentUserReactionType ?? null,
    isSaved: post.savedByCurrentUser ?? false,
  };
}

export function mapPostsToReels(posts: PostResponse[]): Reel[] {
  return posts.map(mapPostToReel).filter((r): r is Reel => r !== null);
}
