import type { PostReactionCountResponse, PostResponse, PostPollResponse } from '@/services/postService';

export interface FeedPost {
  id: string;
  author: { id: string; name: string; avatar: string };
  timestamp: string;
  content: string; // empty string when share wrapper has no caption
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
  groupId?: string;
  page?: { id: string; name: string; avatar?: string };
  pageId?: string;
  mediaList?: { type: 'IMAGE' | 'VIDEO' | 'DOCUMENT'; url: string }[];
  isLivePost?: boolean;
  privacy: PostResponse['privacy'];
  excludedUserIds?: string[];
  allowedUserIds?: string[];
  poll?: PostPollResponse | null;
  // Share-wrapper fields
  sharedPost?: boolean;
  originalPost?: FeedPost;
  // Embedded group card (present when this post shares a group to the feed)
  sharedGroup?: {
    id: string;
    name: string;
    coverPhotoUrl?: string;
    privacy: 'PUBLIC' | 'PRIVATE';
    memberCount: number;
  };
  sharedAlbum?: {
    id: string;
    title: string;
    coverUrl?: string;
    mediaCount: number;
    ownerName: string;
  };
  status?: PostResponse['status'];
  scheduledAt?: string | null;
}

export type PostSourceTab = 'feed' | 'group';

export function getPostSource(post: FeedPost): PostSourceTab {
  if (post.groupId || post.group?.id) return 'group';
  return 'feed';
}

export function groupPostsBySource(posts: FeedPost[]): Record<PostSourceTab, FeedPost[]> {
  const grouped: Record<PostSourceTab, FeedPost[]> = { feed: [], group: [] };
  for (const post of posts) {
    grouped[getPostSource(post)].push(post);
  }
  return grouped;
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

export function formatScheduledPostLabel(scheduledAt?: string | null): string {
  if (!scheduledAt) return 'Đã lên lịch';
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return 'Đã lên lịch';
  const formatted = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  return `Sẽ đăng lúc ${formatted}`;
}

export function isProfileVisiblePost(post: PostResponse, isOwnProfile: boolean): boolean {
  if (!post.status || post.status === 'PUBLISHED') return true;
  return isOwnProfile && post.status === 'SCHEDULED';
}

export function sortProfilePosts(a: PostResponse, b: PostResponse): number {
  const aScheduled = a.status === 'SCHEDULED';
  const bScheduled = b.status === 'SCHEDULED';
  if (aScheduled !== bScheduled) return aScheduled ? -1 : 1;
  if (aScheduled) {
    return new Date(a.scheduledAt || a.createdAt).getTime() - new Date(b.scheduledAt || b.createdAt).getTime();
  }
  return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
}

export function mergeProfilePostList(posts: FeedPost[], incoming: FeedPost): FeedPost[] {
  const rest = posts.filter((post) => post.id !== incoming.id);
  if (incoming.status === 'SCHEDULED') {
    const scheduled = [incoming, ...rest.filter((post) => post.status === 'SCHEDULED')].sort(
      (a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime(),
    );
    const published = rest.filter((post) => post.status !== 'SCHEDULED');
    return [...scheduled, ...published];
  }
  const scheduled = rest.filter((post) => post.status === 'SCHEDULED');
  const published = [incoming, ...rest.filter((post) => post.status !== 'SCHEDULED')];
  return [...scheduled, ...published];
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
      avatar: item.authorAvatarUrl || '',
    },
    timestamp:
      item.status === 'SCHEDULED'
        ? formatScheduledPostLabel(item.scheduledAt)
        : formatPostTimestamp(item.publishedAt || item.createdAt),
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
    groupId: item.groupId ?? undefined,
    page: item.pageId ? {
      id: item.pageId,
      name: item.pageName || 'Trang',
      avatar: item.pageAvatarUrl || undefined,
    } : undefined,
    pageId: item.pageId ?? undefined,
    mediaList: (item.media ?? []).map(m => ({
      type: m.mediaType,
      url: m.mediaUrl || m.fileUrl || ''
    })),
    isLivePost,
    privacy: item.privacy ?? 'PUBLIC',
    excludedUserIds: item.excludedUserIds ?? [],
    allowedUserIds: item.allowedUserIds ?? [],
    poll: item.poll ?? undefined,
    sharedPost: item.sharedPost ?? false,
    originalPost: item.originalPost ? mapApiPost(item.originalPost) : undefined,
    sharedGroup: item.sharedGroup
      ? {
          id: item.sharedGroup.id,
          name: item.sharedGroup.name,
          coverPhotoUrl: item.sharedGroup.coverPhotoUrl || undefined,
          privacy: item.sharedGroup.privacy,
          memberCount: item.sharedGroup.memberCount,
        }
      : undefined,
    sharedAlbum: item.sharedAlbum
      ? {
          id: item.sharedAlbum.id,
          title: item.sharedAlbum.title,
          coverUrl: item.sharedAlbum.coverUrl || undefined,
          mediaCount: item.sharedAlbum.mediaCount,
          ownerName: item.sharedAlbum.ownerName,
        }
      : undefined,
    status: item.status,
    scheduledAt: item.scheduledAt ?? undefined,
  };
}
