import { formatLivePostStoryText } from '@/lib/storyShareText';
import {
  ALBUM_SHARE_PREFIX,
  GROUP_SHARE_PREFIX,
  POST_SHARE_PREFIX,
} from './shareConstants';
import type { ShareTarget } from './shareTypes';

export function getSharePlaceholder(target: ShareTarget): string {
  switch (target.type) {
    case 'album':
      return 'Hãy nói gì đó về album này...';
    case 'group':
      return 'Hãy nói gì đó về nhóm này...';
    case 'post':
      return 'Hãy nói gì đó về nội dung này...';
  }
}

export function getShareLink(target: ShareTarget): string {
  const origin = window.location.origin;
  switch (target.type) {
    case 'album':
      return `${origin}/albums/${target.albumId}`;
    case 'group':
      return `${origin}/groups/${target.groupId}`;
    case 'post':
      return target.linkStyle === 'watch'
        ? `${origin}/watch?id=${target.postId}`
        : `${origin}/posts/${target.postId}`;
  }
}

export function buildMessengerShareContent(target: ShareTarget): string {
  switch (target.type) {
    case 'album':
      return `${ALBUM_SHARE_PREFIX}${JSON.stringify({
        id: target.albumId,
        title: target.title,
        cover: target.coverUrl || undefined,
        mediaCount: target.mediaCount,
        ownerName: target.ownerName || undefined,
      })}`;
    case 'group':
      return `${GROUP_SHARE_PREFIX}${JSON.stringify({
        id: target.groupId,
        name: target.name,
        cover: target.coverUrl || undefined,
        privacy: target.privacy,
        memberCount: target.memberCount,
      })}`;
    case 'post':
      return `${POST_SHARE_PREFIX}${JSON.stringify({
        id: target.postId,
        content: target.content,
        image: target.image,
        authorName: target.authorName,
      })}`;
  }
}

export function getStoryNavigateState(target: ShareTarget): Record<string, unknown> | null {
  switch (target.type) {
    case 'album':
      return {
        sharedImageUrl: target.coverUrl || null,
        sharedText: target.title,
      };
    case 'group':
      return {
        sharedImageUrl: target.coverUrl || null,
        sharedText: target.name,
      };
    case 'post':
      return {
        sharedPostId: target.postId,
        sharedImageUrl: target.image || null,
        sharedText: target.image
          ? null
          : target.isLivePost && target.content
            ? formatLivePostStoryText(target.content)
            : target.content || null,
        sharedIsLive: target.isLivePost,
      };
  }
}

export function getFeedShareErrorMessage(target: ShareTarget): string {
  switch (target.type) {
    case 'album':
      return 'Không thể chia sẻ album';
    case 'group':
      return 'Không thể chia sẻ nhóm';
    case 'post':
      return 'Không thể chia sẻ bài viết';
  }
}
