import { postService, type PostResponse } from '@/services/postService';

export interface ProfilePhoto {
  id: string;
  url: string;
  postId: string;
  date: string;
}

function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.includes('/video/') || /\.(mp4|mov|webm|ogg)(\?.*)?$/i.test(url);
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
      if (media.mediaType !== 'IMAGE') continue;
      const url = media.mediaUrl || media.fileUrl;
      if (!url || seenInPost.has(url)) continue;
      seenInPost.add(url);
      photos.push({
        id: `${post.id}-${media.id}`,
        url,
        postId: post.id,
        date,
      });
    }

    const legacyUrl = post.imageUrl;
    if (legacyUrl && !isVideoUrl(legacyUrl) && !seenInPost.has(legacyUrl)) {
      photos.push({
        id: `${post.id}-legacy`,
        url: legacyUrl,
        postId: post.id,
        date,
      });
    }
  }

  return photos;
}

const POSTS_PAGE_SIZE = 50;

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ERR_CANCELED';
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
