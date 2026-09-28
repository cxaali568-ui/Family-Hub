import { AppNotification } from '../types';
import { INITIAL_NOTIFICATIONS } from './mockData';

class NotificationService {
  private notifications: AppNotification[] = [...INITIAL_NOTIFICATIONS];
  private listeners: Array<(notifications: AppNotification[]) => void> = [];

  getNotifications(userId: string): AppNotification[] {
    return this.notifications.filter(n => n.recipientUserId === userId);
  }

  getUnreadCount(userId: string): number {
    return this.notifications.filter(n => n.recipientUserId === userId && !n.readAt).length;
  }

  markAsRead(id: string): void {
    const item = this.notifications.find(n => n.id === id);
    if (item && !item.readAt) {
      item.readAt = new Date().toISOString();
      this.notify();
    }
  }

  markAllAsRead(userId: string): void {
    const now = new Date().toISOString();
    this.notifications.forEach(n => {
      if (n.recipientUserId === userId && !n.readAt) {
        n.readAt = now;
      }
    });
    this.notify();
  }

  subscribe(callback: (notifications: AppNotification[]) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notify(): void {
    const list = [...this.notifications];
    this.listeners.forEach(cb => cb(list));
  }
}

export const notificationService = new NotificationService();
