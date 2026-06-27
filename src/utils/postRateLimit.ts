import type { PostRateLimitStatus } from '@/types/post';

import { formatRateLimitWindowLabel } from '@/utils/rateLimitWindow';



export function formatPostRateLimitMessage(status: PostRateLimitStatus): string {

  return formatPostActionRateLimitMessage(status, 'đăng', 'bài');

}



export function formatPostEditRateLimitMessage(status: PostRateLimitStatus): string {

  return formatPostActionRateLimitMessage(status, 'chỉnh sửa', 'lần');

}



function formatPostActionRateLimitMessage(

  status: PostRateLimitStatus,

  action: 'đăng' | 'chỉnh sửa',

  unit: 'bài' | 'lần',

): string {

  if (status.limitPerMinute <= 0) {

    return '';

  }

  const windowLabel = formatRateLimitWindowLabel(status.windowSeconds ?? 60);

  if (status.remaining <= 0) {

    const wait =

      status.retryAfterSeconds > 0

        ? ` Thử lại sau ${status.retryAfterSeconds}s.`

        : '';

    return `Bạn đã ${action} ${status.usedInWindow}/${status.limitPerMinute} ${unit} trong ${windowLabel} qua.${wait}`;

  }

  return `Bạn đã ${action} ${status.usedInWindow}/${status.limitPerMinute} ${unit} trong ${windowLabel} qua — còn ${status.remaining} lần.`;

}



export function isPostRateLimitReached(status: PostRateLimitStatus | undefined): boolean {

  if (!status || status.limitPerMinute <= 0) return false;

  return status.remaining <= 0;

}



export const isPostEditRateLimitReached = isPostRateLimitReached;

