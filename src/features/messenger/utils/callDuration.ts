export function calculateCallDurationSeconds(startedAtMs?: number | null, endedAtMs = Date.now()) {
  if (!startedAtMs || !Number.isFinite(startedAtMs) || !Number.isFinite(endedAtMs)) {
    return 0;
  }
  return Math.max(0, Math.floor((endedAtMs - startedAtMs) / 1000));
}

export function normalizeCallDurationSeconds(durationSec?: number | null) {
  if (typeof durationSec !== 'number' || !Number.isFinite(durationSec)) {
    return 0;
  }
  return Math.max(0, Math.floor(durationSec));
}
