import { SETUP_DISMISS_KEY, SETUP_COMPLETE_TOAST_KEY } from '../hooks/useGroupSetupProgress';

export const SETUP_INVITE_SENT_KEY = (groupId: string) => `group-setup-invite-sent-${groupId}`;

export function isInviteSent(groupId: string): boolean {
  try {
    return localStorage.getItem(SETUP_INVITE_SENT_KEY(groupId)) === '1';
  } catch {
    return false;
  }
}

export function markInviteSent(groupId: string): void {
  try {
    localStorage.setItem(SETUP_INVITE_SENT_KEY(groupId), '1');
  } catch {
    /* ignore */
  }
}

export function isSetupDismissed(groupId: string): boolean {
  try {
    return localStorage.getItem(SETUP_DISMISS_KEY(groupId)) === '1';
  } catch {
    return false;
  }
}

export function dismissSetup(groupId: string): void {
  try {
    localStorage.setItem(SETUP_DISMISS_KEY(groupId), '1');
  } catch {
    /* ignore */
  }
}

export function hasShownSetupCompleteToast(groupId: string): boolean {
  try {
    return localStorage.getItem(SETUP_COMPLETE_TOAST_KEY(groupId)) === '1';
  } catch {
    return false;
  }
}

export function markSetupCompleteToastShown(groupId: string): void {
  try {
    localStorage.setItem(SETUP_COMPLETE_TOAST_KEY(groupId), '1');
  } catch {
    /* ignore */
  }
}
