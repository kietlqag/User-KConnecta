import type { ReactionType } from '@/services/postService';
import { isVideoUrl } from '@/utils/mediaUtils';
import type { Reel } from '@/features/watch/types/watch.types';
import type { SearchResultPost, SearchResultReel } from '../types/search.types';

/** Reel posts are typed REEL on the server; legacy heuristic only when postType is absent. */
export function isReelStylePost(post: SearchResultPost): boolean {
  if (post.postType === 'REEL') return true;
  if (post.postType === 'POST') return false;

  const hasVideo = !!(post.video || isVideoUrl(post.image));
  if (!hasVideo) return false;

  const hasImageMedia = post.mediaItems?.some((item) => item.type === 'IMAGE');
  if (hasImageMedia) return false;

  const caption = (post.content ?? '').replace(/#\S+/g, '').trim();
  return caption.length <= 100;
}

export function mapPostToSearchReel(post: SearchResultPost): SearchResultReel {
  const videoSrc = post.video ?? (isVideoUrl(post.image) ? post.image! : '');
  return {
    id: post.id,
    type: 'reel',
    author: { name: post.author.name, avatar: post.author.avatar },
    thumbnail: post.image ?? '',
    videoUrl: videoSrc,
    duration: '',
    views: post.likes ?? 0,
    title: post.content?.split('\n')[0] ?? '',
    userReactionType: post.userReactionType,
    timestamp: post.timestamp,
  };
}

export function mapSearchPostToReel(post: SearchResultPost): Reel | null {
  if (!isReelStylePost(post)) return null;

  const videoUrl = post.video ?? (isVideoUrl(post.image) ? post.image! : '');
  if (!videoUrl) return null;

  const thumbnail = post.image && !isVideoUrl(post.image) ? post.image : videoUrl;

  return {
    id: post.id,
    videoUrl,
    thumbnail,
    creator: {
      id: post.author.id ?? post.id,
      name: post.author.name,
      avatar: post.author.avatar,
    },
    caption: post.content || '',
    privacy: 'PUBLIC',
    group: post.groupId
      ? {
          id: post.groupId,
          name: post.author.groupName ?? 'Nhóm',
          icon: post.author.groupIconUrl,
        }
      : undefined,
    music: {
      name: 'Âm thanh gốc',
      artist: post.author.name,
    },
    likes: post.likes ?? 0,
    comments: post.comments ?? 0,
    shares: post.shares ?? 0,
    views: 0,
    duration: 0,
    postedAt: post.publishedAt ?? post.timestamp,
    isLiked: !!post.userReactionType,
    currentUserReactionType: (post.userReactionType as ReactionType | null) ?? null,
    isSaved: post.savedByCurrentUser ?? false,
  };
}

export function mapSearchPostsToReels(posts: SearchResultPost[], playlistIds?: string[]): Reel[] {
  const postById = new Map(posts.map((post) => [post.id, post]));
  const orderedPosts = playlistIds?.length
    ? playlistIds.map((id) => postById.get(id)).filter((post): post is SearchResultPost => !!post)
    : posts;

  return orderedPosts
    .map(mapSearchPostToReel)
    .filter((reel): reel is Reel => reel !== null);
}

export function splitPostsByKind(posts: SearchResultPost[]) {
  const reels: SearchResultReel[] = [];
  const feedPosts: SearchResultPost[] = [];

  for (const post of posts) {
    if (isReelStylePost(post)) {
      reels.push(mapPostToSearchReel(post));
    } else {
      feedPosts.push(post);
    }
  }

  return { reels, feedPosts };
}
