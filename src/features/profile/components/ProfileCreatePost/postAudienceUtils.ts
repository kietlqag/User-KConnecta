import type { PostResponse } from '@/services/postService';

export type AudienceId = 'public' | 'friends' | 'private';

export type PostPrivacy = PostResponse['privacy'];

export function apiPrivacyToAudience(privacy?: PostPrivacy | null): AudienceId {
  switch (privacy) {
    case 'FRIENDS':
    case 'FRIENDS_EXCEPT':
    case 'SPECIFIC_FRIENDS':
      return 'friends';
    case 'PRIVATE':
      return 'private';
    default:
      return 'public';
  }
}

export function audienceToApiPrivacy(audience: AudienceId): PostPrivacy {
  switch (audience) {
    case 'friends':
      return 'FRIENDS';
    case 'private':
      return 'PRIVATE';
    default:
      return 'PUBLIC';
  }
}

export function getAudienceDescription(audience: AudienceId): string {
  switch (audience) {
    case 'public':
      return 'Bài viết hiển thị trên Bảng feed, trang cá nhân và trong kết quả tìm kiếm.';
    case 'friends':
      return 'Chỉ bạn bè của bạn thấy trên Bảng feed và trang cá nhân. Không hiển thị trong tìm kiếm.';
    case 'private':
      return 'Chỉ mình bạn thấy bài viết này trên trang cá nhân.';
  }
}

export function getAudienceLabel(audience: AudienceId): string {
  switch (audience) {
    case 'public':
      return 'Công khai';
    case 'friends':
      return 'Bạn bè';
    case 'private':
      return 'Chỉ mình tôi';
  }
}
