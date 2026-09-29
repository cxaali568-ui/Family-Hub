import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bill, AppNotification, User } from '../types';

class BillReminderService {
  private checkedReminders = new Set<string>();

  /**
   * Checks bills and triggers appropriate notifications without exposing sensitive account numbers.
   * Uses unique keys to prevent duplicate reminders.
   */
  async checkAndSendBillReminders(familyId: string, bills: Bill[], currentUser: User): Promise<void> {
    if (!familyId || !currentUser) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const threeDaysLater = new Date();
    threeDaysLater.setDate(today.getDate() + 3);
    const threeDaysStr = threeDaysLater.toISOString().split('T')[0];

    for (const bill of bills) {
      if (bill.status === 'Paid' || bill.status === 'Cancelled') continue;

      let reminderType: string | null = null;
      let reminderTitle = '';
      let reminderMessage = '';

      if (bill.dueDate === todayStr) {
        reminderType = 'due_today';
        reminderTitle = `Bill Due Today: ${bill.providerName}`;
        reminderMessage = `Your ${bill.billTypeName} bill of ${bill.currency} ${bill.amount.toLocaleString()} is due today.`;
      } else if (bill.dueDate === threeDaysStr) {
        reminderType = 'due_in_3_days';
        reminderTitle = `Bill Due Soon: ${bill.providerName}`;
        reminderMessage = `Your ${bill.billTypeName} bill of ${bill.currency} ${bill.amount.toLocaleString()} is due in 3 days (${bill.dueDate}).`;
      } else if (bill.status === 'Overdue') {
        reminderType = 'overdue';
        reminderTitle = `Overdue Bill: ${bill.providerName}`;
        reminderMessage = `Your ${bill.billTypeName} bill of ${bill.currency} ${bill.remainingAmount.toLocaleString()} is overdue since ${bill.dueDate}.`;
      }

      if (!reminderType) continue;

      const reminderKey = `reminder_${familyId}_${bill.id}_${reminderType}`;
      if (this.checkedReminders.has(reminderKey)) continue;
      this.checkedReminders.add(reminderKey);

      try {
        // Check if reminder notification doc already exists
        const notifDocRef = doc(db, 'notifications', reminderKey);
        const existing = await getDoc(notifDocRef);
        if (existing.exists()) continue;

        const notif: AppNotification = {
          id: reminderKey,
          recipientUserId: currentUser.id,
          familyId,
          type: 'bill_due',
          title: reminderTitle,
          message: reminderMessage,
          relatedEntityType: 'expense',
          relatedEntityId: bill.id,
          createdAt: new Date().toISOString(),
          readAt: null,
        };

        await setDoc(notifDocRef, notif);
      } catch (err) {
        console.warn('Could not dispatch bill reminder notification:', err);
      }
    }
  }
}

export const billReminderService = new BillReminderService();
