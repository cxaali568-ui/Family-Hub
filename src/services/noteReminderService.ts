import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FamilyNote, ReminderOption } from '../types';

class NoteReminderService {
  /**
   * Computes target reminder ISO string based on dueDate, dueTime, and reminder option
   */
  computeReminderTargetDate(
    dueDate: string,
    dueTime: string = '09:00',
    option: ReminderOption
  ): string | undefined {
    if (!dueDate || option === 'none') return undefined;

    try {
      const [year, month, day] = dueDate.split('-').map(Number);
      const [hours, minutes] = (dueTime || '09:00').split(':').map(Number);

      const target = new Date(year, month - 1, day, hours, minutes, 0, 0);

      switch (option) {
        case 'at_due_time':
          break;
        case '1_day_before':
          target.setDate(target.getDate() - 1);
          break;
        case '2_days_before':
          target.setDate(target.getDate() - 2);
          break;
        case '3_days_before':
          target.setDate(target.getDate() - 3);
          break;
        case '1_week_before':
          target.setDate(target.getDate() - 7);
          break;
        default:
          return undefined;
      }

      return target.toISOString();
    } catch {
      return undefined;
    }
  }

  /**
   * Checks a list of notes for any due reminders and fires idempotent notifications
   */
  async processDueReminders(notes: FamilyNote[]): Promise<void> {
    const now = new Date();

    for (const note of notes) {
      if (
        note.reminder?.enabled &&
        note.reminder.targetDate &&
        !note.reminder.notified &&
        note.status !== 'completed' &&
        note.status !== 'cancelled' &&
        !note.deletedAt &&
        !note.isArchived
      ) {
        const reminderTime = new Date(note.reminder.targetDate);
        if (now >= reminderTime) {
          try {
            // Determine recipient
            const recipientUserId = note.assignedToMemberId || note.createdBy;
            if (!recipientUserId) continue;

            // Send notification
            const notifCol = collection(db, 'notifications');
            await addDoc(notifCol, {
              id: `notif_rem_${note.id}_${Date.now()}`,
              recipientUserId,
              familyId: note.familyId,
              type: 'note_reminder',
              title: `Reminder: ${note.title}`,
              message: `Note "${note.title}" is due ${note.dueDate || 'soon'}.`,
              relatedEntityType: 'family_note',
              relatedEntityId: note.id,
              createdAt: new Date().toISOString(),
              readAt: null,
            });

            // Mark reminder as notified to avoid duplicate notifications
            const noteDoc = doc(db, 'families', note.familyId, 'notes', note.id);
            await updateDoc(noteDoc, {
              'reminder.notified': true,
              updatedAt: new Date().toISOString(),
            });
          } catch (err) {
            console.warn('Error processing reminder for note:', note.id, err);
          }
        }
      }
    }
  }
}

export const noteReminderService = new NoteReminderService();
