import { postService, type PostResponse } from '@/services/postService';
import { isVideoUrl, getVideoThumbnail } from '@/utils/mediaUtils';

export interface ProfilePhoto {
  id: string;
  url: string;
  postId: string;
  date: string;
  mediaType: 'IMAGE' | 'VIDEO';
  thumbnailUrl?: string | null;
}

function formatPhotoDate(post: PostResponse): string {
  return new Date(post.publishedAt || post.createdAt).toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function extractPhotosFromPosts(posts: PostResponse[]): ProfilePhoto[] {
  const photos: ProfilePhoto[] = [];

  for (const post of posts) {
    if (post.status && post.status !== 'PUBLISHED') continue;
    if (post.sharedPost) continue;

    const date = formatPhotoDate(post);
    const seenInPost = new Set<string>();

    for (const media of post.media ?? []) {
      const url = media.mediaUrl || media.fileUrl;
      if (!url || seenInPost.has(url)) continue;
      seenInPost.add(url);
      
      const isVideo = media.mediaType === 'VIDEO';

      photos.push({
        id: `${post.id}-${media.id}`,
        url,
        postId: post.id,
        date,
        mediaType: isVideo ? 'VIDEO' : 'IMAGE',
        thumbnailUrl: isVideo ? media.thumbnailUrl : null,
      });
    }

    const legacyUrl = post.imageUrl;
    if (legacyUrl && !seenInPost.has(legacyUrl)) {
      const isVideo = isVideoUrl(legacyUrl);
      photos.push({
        id: `${post.id}-legacy`,
        url: legacyUrl,
        postId: post.id,
        date,
        mediaType: isVideo ? 'VIDEO' : 'IMAGE',
        thumbnailUrl: isVideo ? getVideoThumbnail(legacyUrl) : null,
      });
    }
  }

  return photos;
}

const POSTS_PAGE_SIZE = 50;

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (typeof error !== 'object' || error === null) return false;
  const err = error as { name?: string; code?: string; message?: string };
  if (err.name === 'AbortError' || err.name === 'CanceledError') return true;
  if (err.code === 'ERR_CANCELED') return true;
  return err.message === 'canceled' || err.message === 'Aborted';
}

export async function fetchAllUserPosts(
  authorId: string,
  currentUserId?: string,
  signal?: AbortSignal,
): Promise<PostResponse[]> {
  const allPosts: PostResponse[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const res = await postService.getAllPosts(currentUserId, authorId, page, POSTS_PAGE_SIZE, undefined, signal);
    allPosts.push(...res.content);
    hasMore = res.number + 1 < res.totalPages;
    page += 1;
  }

  return allPosts;
}
