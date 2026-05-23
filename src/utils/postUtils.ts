import type { PostReactionCountResponse, PostResponse } from '@/services/postService';

export interface FeedPost {
  id: string;
  author: { id: string; name: string; avatar: string };
  timestamp: string;
  content: string;
  image?: string;
  media?: { type: 'image' | 'video'; url: string };
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
  currentUserReactionType: PostResponse['currentUserReactionType'];
  reactionCounts?: PostReactionCountResponse[];
  group?: { id: string; name: string; icon?: string };
  mediaList?: { type: 'IMAGE' | 'VIDEO'; url: string }[];
  isLivePost?: boolean;
}

export function formatPostTimestamp(dateString?: string | null): string {
  if (!dateString) return 'Vừa xong';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Vừa xong';
  const diffMinutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date);
}

function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.includes('/video/') || /\.(mp4|mov|webm|ogg)(\?.*)?$/i.test(url);
}

export function mapApiPost(item: PostResponse): FeedPost {
  const firstVideo = (item.media ?? []).find((m) => m.mediaType === 'VIDEO');
  const firstImage = (item.media ?? []).find((m) => m.mediaType === 'IMAGE');
  const legacyVideoUrl = !firstVideo && isVideoUrl(item.imageUrl) ? item.imageUrl : null;
  const legacyImageUrl = item.imageUrl && !isVideoUrl(item.imageUrl) ? item.imageUrl : null;
  const isLikelyLiveByContent = (item.content || '').includes('\n\n') && (item.media ?? []).length === 0;
  const isLivePost = item.backgroundStyle === 'LIVE_POST' || isLikelyLiveByContent;

  const videoUrl = firstVideo?.mediaUrl || firstVideo?.fileUrl || legacyVideoUrl || undefined;
  const imageUrl = firstImage?.mediaUrl || firstImage?.fileUrl || legacyImageUrl || undefined;

  return {
    id: item.id,
    author: {
      id: item.authorId,
      name: item.authorFullName,
      avatar:
        item.authorAvatarUrl ||
        `https://ui-avatars.com/api/?background=random&name=${encodeURIComponent(item.authorFullName || 'User')}`,
    },
    timestamp: formatPostTimestamp(item.publishedAt || item.createdAt),
    content: item.content || '',
    image: imageUrl,
    media: videoUrl
      ? { type: 'video', url: videoUrl }
      : imageUrl
        ? { type: 'image', url: imageUrl }
        : undefined,
    likes: item.reactionCount,
    comments: item.commentCount,
    shares: item.shareCount,
    isLiked: !!item.currentUserReactionType,
    isSaved: item.savedByCurrentUser ?? false,
    currentUserReactionType: item.currentUserReactionType,
    reactionCounts: item.reactionCounts,
    group: item.groupId ? {
      id: item.groupId,
      name: item.groupName || 'Nhóm',
      icon: item.groupIconUrl || undefined
    } : undefined,
    mediaList: (item.media ?? []).map(m => ({
      type: m.mediaType,
      url: m.mediaUrl || m.fileUrl || ''
    })),
    isLivePost,
  };
}
