export type RateLimitWindowUnit = 'minute' | 'hour' | 'day';

export function rateLimitWindowToSeconds(value: number, unit: RateLimitWindowUnit): number {
  const safeValue = Math.max(1, value);
  switch (unit) {
    case 'hour':
      return safeValue * 3600;
    case 'day':
      return safeValue * 86400;
    default:
      return safeValue * 60;
  }
}

export function formatRateLimitWindowLabel(windowSeconds: number): string {
  const seconds = Math.max(60, windowSeconds);
  if (seconds % 86400 === 0) {
    const days = seconds / 86400;
    return days === 1 ? '1 ngày' : `${days} ngày`;
  }
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600;
    return hours === 1 ? '1 giờ' : `${hours} giờ`;
  }
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes === 1 ? '1 phút' : `${minutes} phút`;
}

export function formatRateLimitRule(
  count: number,
  windowValue: number,
  unit: RateLimitWindowUnit,
): string {
  const unitLabel =
    unit === 'day' ? 'ngày' : unit === 'hour' ? 'giờ' : 'phút';
  return `Tối đa ${count} lần / ${windowValue} ${unitLabel}`;
}
