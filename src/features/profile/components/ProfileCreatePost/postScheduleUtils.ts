/**
 * datetime-local is interpreted in the user's browser timezone.
 * Backend stores LocalDateTime with Jackson time-zone Asia/Ho_Chi_Minh (see application.yml).
 */
export function toApiScheduledAt(datetimeLocal: string): string {
  const t = datetimeLocal.trim();
  if (!t) return '';
  return t.length >= 19 ? t : `${t}:00`;
}

export function debugScheduleLog(label: string, payload: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.log(`[post-schedule] ${label}`, payload);
  }
}
