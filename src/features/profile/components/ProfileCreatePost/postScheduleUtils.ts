/**
 * datetime-local is interpreted in the user's browser timezone.
 * Backend stores LocalDateTime with Jackson time-zone Asia/Ho_Chi_Minh (see application.yml).
 */
export function toApiScheduledAt(datetimeLocal: string): string {
  const t = datetimeLocal.trim();
  if (!t) return '';
  return t.length >= 19 ? t : `${t}:00`;
}

export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function scheduledAtApiToDatetimeLocal(iso?: string | null): string {
  if (!iso) return toDatetimeLocalValue(new Date(Date.now() + 60 * 60 * 1000));
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return toDatetimeLocalValue(new Date(Date.now() + 60 * 60 * 1000));
  return toDatetimeLocalValue(d);
}

export function debugScheduleLog(label: string, payload: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.log(`[post-schedule] ${label}`, payload);
  }
}
