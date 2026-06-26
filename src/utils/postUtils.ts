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
  };
}
