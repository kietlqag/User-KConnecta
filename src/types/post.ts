export interface PostRateLimitStatus {
  limitPerMinute: number;
  usedInWindow: number;
  remaining: number;
  retryAfterSeconds: number;
  windowSeconds?: number;
}
