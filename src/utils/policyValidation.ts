import type { PublicPolicyResponse } from '@/types/policy';

const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

export type PostPolicyAction = 'create' | 'edit';

function normalizeCategory(category: string): string {
  if (category === 'sensitive') return 'watchlist';
  return category;
}

function keywordCategoryReason(category: string): string {
  switch (normalizeCategory(category)) {
    case 'blacklist':
    case 'banned':
      return 'chứa từ ngữ bị cấm theo quy tắc cộng đồng';
    case 'watchlist':
      return 'chứa ngôn từ nhạy cảm hoặc không phù hợp tiêu chuẩn cộng đồng';
    case 'blocked_domain':
      return 'chứa liên kết hoặc tên miền không được phép';
    default:
      return 'chứa nội dung không được phép';
  }
}

export function buildPostPolicyViolationMessage(
  category: string,
  action: PostPolicyAction = 'create',
): string {
  const actionPhrase = action === 'edit' ? 'lưu thay đổi bài viết' : 'đăng bài viết';
  return `Không thể ${actionPhrase}. Lý do: nội dung ${keywordCategoryReason(category)}. Vui lòng chỉnh sửa và thử lại.`;
}

export function validatePostAgainstPolicy(
  content: string,
  mediaCount: number,
  policy: PublicPolicyResponse | undefined,
  action: PostPolicyAction = 'create',
): string | null {
  if (!policy) return null;

  const text = content ?? '';
  const { maxPostLength, maxImagesPerPost } = policy.postPolicy;

  if (text.length > maxPostLength) {
    return `Bài viết tối đa ${maxPostLength} ký tự`;
  }
  if (mediaCount > maxImagesPerPost) {
    return `Tối đa ${maxImagesPerPost} ảnh/video mỗi bài`;
  }

  return validateTextKeywords(text, policy, action);
}

export function validateChatAgainstPolicy(
  content: string,
  policy: PublicPolicyResponse | undefined
): string | null {
  if (!policy) return null;
  const text = content ?? '';

  const keywordError = validateTextKeywords(text, policy);
  if (keywordError) return keywordError;

  if (policy.chatPolicy.blockMaliciousLinks) {
    const blocked = getBlockedDomains(policy);
    const matches = text.matchAll(URL_PATTERN);
    for (const m of matches) {
      const url = (m[0] ?? '').toLowerCase();
      if (blocked.some((b) => url.includes(b))) {
        return 'Link không được phép trên nền tảng';
      }
    }
  }

  return null;
}

export function checkKeywords(
  text: string,
  policy: PublicPolicyResponse | undefined,
  action: PostPolicyAction = 'create',
): string | null {
  if (!policy) return null;
  return validateTextKeywords(text, policy, action);
}

function validateTextKeywords(
  text: string,
  policy: PublicPolicyResponse,
  action: PostPolicyAction = 'create',
): string | null {
  const keywords = policy.fullConfig?.keywords;
  if (!Array.isArray(keywords)) return null;

  const normalized = text.toLowerCase();
  for (const kw of keywords as { value?: string; category?: string }[]) {
    const value = (kw.value ?? '').toLowerCase();
    const category = normalizeCategory(kw.category ?? '');
    if (!value) continue;
    // blocked_domain chỉ kiểm tra trong URL — khớp backend PolicyContentValidator
    if (category === 'blocked_domain') continue;
    if (normalized.includes(value)) {
      return buildPostPolicyViolationMessage(category, action);
    }
  }
  return null;
}

function getBlockedDomains(policy: PublicPolicyResponse): string[] {
  const keywords = policy.fullConfig?.keywords;
  if (!Array.isArray(keywords)) return [];
  return (keywords as { value?: string; category?: string }[])
    .filter((k) => k.category === 'blocked_domain')
    .map((k) => (k.value ?? '').toLowerCase())
    .filter(Boolean);
}
