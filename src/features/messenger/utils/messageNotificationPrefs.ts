const NOTIFY_MESSAGES_KEY = 'kconnecta-notify-messages';

export function getNotifyMessagesEnabled(): boolean {
  try {
    const raw = localStorage.getItem(NOTIFY_MESSAGES_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

export function setNotifyMessagesEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(NOTIFY_MESSAGES_KEY, String(enabled));
  } catch {
    // ignore storage errors
  }
}
