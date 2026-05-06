import { Notification } from './types/notifications.types';

/**
 * FIFO Queue for notifications.
 * First event published = first notification shown.
 */
export class NotificationQueue {
  private items: Notification[] = [];

  /** Add to back of queue (O(1)) */
  enqueue(notification: Notification): void {
    this.items.push(notification);
  }

  /** Remove from front of queue (O(n) but negligible for notification lists) */
  dequeue(): Notification | undefined {
    return this.items.shift();
  }

  peek(): Notification | undefined {
    return this.items[0];
  }

  get size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /** Return all items in FIFO order without consuming */
  toArray(): Notification[] {
    return [...this.items];
  }

  clear(): void {
    this.items = [];
  }
}
