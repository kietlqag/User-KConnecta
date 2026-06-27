import { api } from './api';

export const USER_BLOCK_CHANGED_EVENT = 'user-block-changed';

let cachedIds: Set<string> | null = null;
let cachePromise: Promise<Set<string>> | null = null;

export function invalidateBlockedUsersCache() {
  cachedIds = null;
  cachePromise = null;
}

export function notifyUserBlockChanged() {
  invalidateBlockedUsersCache();
  window.dispatchEvent(new CustomEvent(USER_BLOCK_CHANGED_EVENT));
}

/** User IDs in a block relationship with the current user (either direction). */
export async function getRelatedBlockedUserIds(force = false): Promise<Set<string>> {
  if (!force && cachedIds) {
    return cachedIds;
  }
  if (!force && cachePromise) {
    return cachePromise;
  }

  cachePromise = api
    .get<string[]>('/users/me/blocks/related-ids')
    .then((ids) => {
      cachedIds = new Set(ids);
      return cachedIds;
    })
    .catch(() => cachedIds ?? new Set<string>())
    .finally(() => {
      cachePromise = null;
    });

  return cachePromise;
}
