import { useMessageNotifications } from '../hooks/useMessageNotifications';

export function MessageNotificationsListener() {
  useMessageNotifications();
  return null;
}
