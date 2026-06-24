import type { PostRateLimitStatus } from '@/types/post';

export function formatPostRateLimitMessage(status: PostRateLimitStatus): string {
  if (status.limitPerMinute <= 0) {
    return '';
  }
  if (status.remaining <= 0) {
    const wait =
      status.retryAfterSeconds > 0
        ? ` Thử lại sau ${status.retryAfterSeconds}s.`
        : '';
    return `Bạn đã đăng ${status.usedInWindow}/${status.limitPerMinute} bài trong phút qua.${wait}`;
  }
  return `Bạn đã đăng ${status.usedInWindow}/${status.limitPerMinute} bài trong phút qua — còn ${status.remaining} lần.`;
}

export function isPostRateLimitReached(status: PostRateLimitStatus | undefined): boolean {
  if (!status || status.limitPerMinute <= 0) return false;
  return status.remaining <= 0;
}
