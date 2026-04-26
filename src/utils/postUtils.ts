import type { PostReactionCountResponse, PostResponse } from '@/services/postService';

export interface FeedPost {
  id: string;
  author: { id: string; name: string; avatar: string };
  timestamp: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  currentUserReactionType: PostResponse['currentUserReactionType'];
  reactionCounts?: PostReactionCountResponse[];
  group?: { id: string; name: string; icon?: string };
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

export function mapApiPost(item: PostResponse): FeedPost {
  const firstImage = (item.media ?? []).find((m) => m.mediaType === 'IMAGE');
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
    image: firstImage?.mediaUrl || firstImage?.fileUrl,
    likes: item.reactionCount,
    comments: item.commentCount,
    shares: item.shareCount,
    isLiked: !!item.currentUserReactionType,
    currentUserReactionType: item.currentUserReactionType,
    reactionCounts: item.reactionCounts,
    group: item.groupId ? {
      id: item.groupId,
      name: item.groupName || 'Nhóm',
      icon: item.groupIconUrl || undefined
    } : undefined
  };
}
