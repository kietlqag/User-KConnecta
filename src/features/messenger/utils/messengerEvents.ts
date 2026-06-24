export const MESSENGER_UNREAD_CHANGED_EVENT = 'messenger:unread-changed';

export function notifyMessengerUnreadChanged() {
  window.dispatchEvent(new Event(MESSENGER_UNREAD_CHANGED_EVENT));
}
