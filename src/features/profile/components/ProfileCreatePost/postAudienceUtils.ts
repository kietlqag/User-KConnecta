import type { PostResponse } from '@/services/postService';

export type AudienceId = 'public' | 'friends' | 'specific-friends' | 'friends-except' | 'private';

export type PostPrivacy = PostResponse['privacy'];

export function apiPrivacyToAudience(privacy?: PostPrivacy | null): AudienceId {
  switch (privacy) {
    case 'FRIENDS':
      return 'friends';
    case 'FRIENDS_EXCEPT':
      return 'friends-except';
    case 'SPECIFIC_FRIENDS':
      return 'specific-friends';
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
    case 'friends-except':
      return 'FRIENDS_EXCEPT';
    case 'specific-friends':
      return 'SPECIFIC_FRIENDS';
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
    case 'specific-friends':
      return 'Chỉ những bạn bè được chọn mới thấy. Không hiển thị trong tìm kiếm.';
    case 'friends-except':
      return 'Bạn bè của bạn thấy, trừ những người bạn chọn. Không hiển thị trong tìm kiếm.';
    case 'private':
      return 'Chỉ mình bạn thấy bài viết này trên trang cá nhân.';
  }
}

export function getAudienceLabel(
  audience: AudienceId,
  excludedCount = 0,
  allowedCount = 0,
): string {
  switch (audience) {
    case 'public':
      return 'Công khai';
    case 'friends':
      return 'Bạn bè';
    case 'friends-except':
      return excludedCount > 0 ? `Bạn bè ngoại trừ (${excludedCount})` : 'Bạn bè ngoại trừ...';
    case 'specific-friends':
      return allowedCount > 0 ? `Bạn bè cụ thể (${allowedCount})` : 'Bạn bè cụ thể...';
    case 'private':
      return 'Chỉ mình tôi';
  }
}
