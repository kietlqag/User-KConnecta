import type { PublicPolicyResponse } from '@/types/policy';

const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

export function validatePostAgainstPolicy(
  content: string,
  mediaCount: number,
  policy: PublicPolicyResponse | undefined
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

  return validateTextKeywords(text, policy);
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
  policy: PublicPolicyResponse | undefined
): string | null {
  if (!policy) return null;
  return validateTextKeywords(text, policy);
}

function validateTextKeywords(
  text: string,
  policy: PublicPolicyResponse
): string | null {
  const keywords = policy.fullConfig?.keywords;
  if (!Array.isArray(keywords)) return null;

  const normalized = text.toLowerCase();
  for (const kw of keywords as { value?: string; category?: string }[]) {
    const value = (kw.value ?? '').toLowerCase();
    const category = kw.category ?? '';
    if (!value || category === 'blocked_domain') continue;
    if (normalized.includes(value)) {
      return 'Nội dung chứa từ khóa không được phép';
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
