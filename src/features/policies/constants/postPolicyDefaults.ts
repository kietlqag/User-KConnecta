import type { PublicPostPolicy } from '@/types/policy';
export const DEFAULT_POST_POLICY: PublicPostPolicy = {
  maxPostLength: 5000,
  maxImagesPerPost: 10,
  maxVideoMb: 100,
  allowedFileTypes: 'jpg,jpeg,png,gif,webp,mp4,mov',
  postsPerMinute: 3,
  postRateLimitWindowValue: 1,
  postRateLimitWindowUnit: 'minute',
  editsPerMinute: 3,
  editRateLimitWindowValue: 1,
  editRateLimitWindowUnit: 'minute',
};

export const formatAllowedFileTypes = (raw: string): string =>
  raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.toUpperCase())
    .join(', ');

export const formatPolicyUpdatedAt = (iso?: string): string | undefined => {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};
