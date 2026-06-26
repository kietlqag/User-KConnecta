import * as React from 'react';
import { isAbortError } from './profilePhotoUtils';

const PREFIX = '[ProfileTab]';

export type ProfileTabId = 'all' | 'about' | 'friends' | 'photos' | 'watch' | 'albums';

function serializeError(error: unknown) {
  if (error instanceof Error) {
    const withStatus = error as Error & { status?: number };
    return {
      message: withStatus.message,
      status: withStatus.status,
      name: withStatus.name,
      stack: withStatus.stack,
    };
  }
  return { message: String(error) };
}

export function logProfileTabClick(tab: ProfileTabId, path: string, fromPath: string) {
  console.info(`${PREFIX} click`, { tab, path, fromPath, at: new Date().toISOString() });
}

export function logProfileTabRouteChange(
  pathname: string,
  context?: { resolvedId?: string; accessDenied?: boolean; profileKey?: string },
) {
  console.info(`${PREFIX} route`, { pathname, ...context, at: new Date().toISOString() });
}

export function logProfileTabRedirect(reason: string, from: string, to: string) {
  console.info(`${PREFIX} redirect`, { reason, from, to, note: 'expected when opening profile by UUID', at: new Date().toISOString() });
}

export function logProfileTabError(
  tab: string,
  phase: string,
  error: unknown,
  context?: Record<string, unknown>,
) {
  if (isAbortError(error)) {
    console.debug(`${PREFIX} aborted`, { tab, phase, ...context, at: new Date().toISOString() });
    return;
  }
  console.error(`${PREFIX} error`, {
    tab,
    phase,
    ...context,
    error: serializeError(error),
    at: new Date().toISOString(),
  });
}

/** Log mount/unmount khi vào từng tab con của profile. */
export function useProfileTabDebug(tab: string, resolvedId?: string) {
  React.useEffect(() => {
    console.info(`${PREFIX} mount`, { tab, resolvedId, at: new Date().toISOString() });
    return () => {
      console.info(`${PREFIX} unmount`, { tab, at: new Date().toISOString() });
    };
  }, [tab, resolvedId]);
}
