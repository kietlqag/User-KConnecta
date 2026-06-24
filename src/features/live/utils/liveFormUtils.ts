export const normalizeScheduledAtForApi = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length === 16 ? `${trimmed}:00` : trimmed;
};

export const isScheduledAtInFuture = (value: string) => {
  const normalized = normalizeScheduledAtForApi(value);
  if (!normalized) return false;
  const parsed = new Date(normalized);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now();
};

export const isScheduledSessionDue = (scheduledAt: string | null | undefined) => {
  if (!scheduledAt) return true;
  const parsed = new Date(scheduledAt);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() <= Date.now();
};

/** SCHEDULED but host never started — older than grace window. */
export const isScheduledSessionStale = (
  scheduledAt: string | null | undefined,
  staleAfterMs = 7 * 24 * 60 * 60 * 1000,
) => {
  if (!scheduledAt) return false;
  const parsed = new Date(scheduledAt);
  if (Number.isNaN(parsed.getTime())) return false;
  return Date.now() - parsed.getTime() > staleAfterMs;
};

export const shouldShowGroupEvent = (session: {
  status: string;
  scheduledAt?: string | null;
}) => {
  if (session.status !== 'SCHEDULED') return true;
  return !isScheduledSessionStale(session.scheduledAt);
};

export const formatScheduledDisplayFromIso = (value: string | null | undefined) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
};

export const formatScheduledDisplay = (value: string) => {
  const parsed = new Date(normalizeScheduledAtForApi(value) ?? value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
};

export type LivePostPrivacy = 'PUBLIC' | 'FRIENDS' | 'FRIENDS_EXCEPT' | 'PRIVATE';

export const mapPrivacyToPostApi = (privacy: 'PUBLIC' | 'FRIENDS' | 'FRIENDS_EXCEPT' | 'ONLY_ME'): LivePostPrivacy => {
  if (privacy === 'ONLY_ME') return 'PRIVATE';
  return privacy;
};
