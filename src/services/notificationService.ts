import {
  collection,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppNotification } from '../types';

class NotificationService {
  /**
   * Subscribes to real-time notifications for the current user
   */
  subscribeUserNotifications(
    userId: string,
    callback: (notifications: AppNotification[]) => void
  ): () => void {
    if (!userId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'notifications'),
      where('recipientUserId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const notifs: AppNotification[] = [];
        snapshot.forEach((d) => {
          notifs.push(d.data() as AppNotification);
        });
        callback(notifs);
      },
      (error) => {
        console.warn("Error listening to notifications:", error);
      }
    );
  }

  /**
   * Marks a single notification as read
   */
  async markAsRead(id: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', id), {
        readAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Could not mark notification as read:", err);
    }
  }

  /**
   * Marks all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientUserId', '==', userId),
        where('readAt', '==', null)
      );

      const snap = await getDocs(q);
      if (snap.empty) return;

      const batch = writeBatch(db);
      const now = new Date().toISOString();

      snap.forEach((d) => {
        batch.update(doc(db, 'notifications', d.id), { readAt: now });
      });

      await batch.commit();
    } catch (err) {
      console.warn("Could not mark all notifications as read:", err);
    }
  }
}

export const notificationService = new NotificationService();
