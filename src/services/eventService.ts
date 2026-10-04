import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import {
  FamilyEvent,
  FamilyReminder,
  CalendarSettings,
  User,
  AppNotification,
} from '../types';
import { familyService } from './familyService';

class EventService {
  /**
   * Real-time subscription to family events
   */
  subscribeEvents(
    familyId: string,
    callback: (events: FamilyEvent[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!familyId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'events');
    const q = query(colRef, orderBy('startDate', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const events: FamilyEvent[] = [];
        snapshot.forEach((d) => {
          events.push(d.data() as FamilyEvent);
        });
        callback(events);
      },
      (err) => {
        console.warn('Error subscribing to family events:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Real-time subscription to family reminders
   */
  subscribeReminders(
    familyId: string,
    callback: (reminders: FamilyReminder[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!familyId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'reminders');
    const q = query(colRef, orderBy('dueDate', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const reminders: FamilyReminder[] = [];
        snapshot.forEach((d) => {
          reminders.push(d.data() as FamilyReminder);
        });
        callback(reminders);
      },
      (err) => {
        console.warn('Error subscribing to family reminders:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Creates a new family event
   */
  async addEvent(
    familyId: string,
    eventData: Omit<FamilyEvent, 'id' | 'familyId' | 'createdAt' | 'updatedAt'>,
    currentUser: User
  ): Promise<FamilyEvent> {
    const colRef = collection(db, 'families', familyId, 'events');
    const newDoc = doc(colRef);
    const now = new Date().toISOString();

    const event: FamilyEvent = {
      ...eventData,
      id: newDoc.id,
      familyId,
      createdBy: currentUser.id,
      createdByName: currentUser.name || currentUser.fullName || 'Family Member',
      createdAt: now,
      updatedAt: now,
      status: eventData.status || 'scheduled',
      assignedMemberIds: eventData.assignedMemberIds || [],
    };

    // Clean undefined fields for Firestore
    const cleanEvent: any = { ...event };
    Object.keys(cleanEvent).forEach((key) => {
      if (cleanEvent[key] === undefined) {
        delete cleanEvent[key];
      }
    });

    await setDoc(newDoc, cleanEvent);

    // Audit log
    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name || 'Member',
      action: `added event "${event.title}" to the family calendar`,
      entityType: 'event',
      entityId: event.id,
    });

    // Notify assigned members if any
    if (event.assignedMemberIds && event.assignedMemberIds.length > 0) {
      for (const memberId of event.assignedMemberIds) {
        if (memberId !== currentUser.id) {
          await this.createNotification({
            recipientUserId: memberId,
            familyId,
            title: `New Event: ${event.title}`,
            message: `${event.createdByName} assigned you to "${event.title}" on ${event.startDate}.`,
          });
        }
      }
    }

    return event;
  }

  /**
   * Updates an existing event
   */
  async updateEvent(
    familyId: string,
    eventId: string,
    updates: Partial<FamilyEvent>,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'events', eventId);
    const now = new Date().toISOString();

    const cleanUpdates: any = {
      ...updates,
      updatedAt: now,
    };

    Object.keys(cleanUpdates).forEach((key) => {
      if (cleanUpdates[key] === undefined) {
        delete cleanUpdates[key];
      }
    });

    await updateDoc(docRef, cleanUpdates);

    // Audit log
    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name || 'Member',
      action: `updated event "${updates.title || 'Event'}"`,
      entityType: 'event',
      entityId: eventId,
    });
  }

  /**
   * Deletes an event
   */
  async deleteEvent(
    familyId: string,
    eventId: string,
    currentUser: User,
    eventTitle?: string
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'events', eventId);
    await deleteDoc(docRef);

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name || 'Member',
      action: `deleted event "${eventTitle || 'Event'}" from calendar`,
      entityType: 'event',
      entityId: eventId,
    });
  }

  /**
   * Cancels a single occurrence of a recurring event by adding it to exceptions
   */
  async cancelOccurrence(
    familyId: string,
    eventId: string,
    occurrenceDate: string,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'events', eventId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const event = snap.data() as FamilyEvent;
    const existingExceptions = event.recurrence?.exceptions || [];
    if (!existingExceptions.includes(occurrenceDate)) {
      const updatedExceptions = [...existingExceptions, occurrenceDate];
      await updateDoc(docRef, {
        'recurrence.exceptions': updatedExceptions,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Adds a reminder
   */
  async addReminder(
    familyId: string,
    reminderData: Omit<FamilyReminder, 'id' | 'familyId' | 'createdAt' | 'updatedAt'>,
    currentUser: User
  ): Promise<FamilyReminder> {
    const colRef = collection(db, 'families', familyId, 'reminders');
    const newDoc = doc(colRef);
    const now = new Date().toISOString();

    const reminder: FamilyReminder = {
      ...reminderData,
      id: newDoc.id,
      familyId,
      createdBy: currentUser.id,
      createdByName: currentUser.name || 'Family Member',
      createdAt: now,
      updatedAt: now,
      status: reminderData.status || 'pending',
      assignedMemberIds: reminderData.assignedMemberIds || [],
    };

    const cleanReminder: any = { ...reminder };
    Object.keys(cleanReminder).forEach((k) => {
      if (cleanReminder[k] === undefined) delete cleanReminder[k];
    });

    await setDoc(newDoc, cleanReminder);

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name || 'Member',
      action: `added reminder "${reminder.title}"`,
      entityType: 'reminder',
      entityId: reminder.id,
    });

    return reminder;
  }

  /**
   * Updates reminder status (pending | completed | cancelled)
   */
  async updateReminderStatus(
    familyId: string,
    reminderId: string,
    status: 'pending' | 'completed' | 'cancelled',
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'reminders', reminderId);
    const now = new Date().toISOString();

    const updates: any = {
      status,
      updatedAt: now,
    };

    if (status === 'completed') {
      updates.completedAt = now;
      updates.completedBy = currentUser.id;
    } else {
      updates.completedAt = null;
      updates.completedBy = null;
    }

    await updateDoc(docRef, updates);
  }

  /**
   * Deletes a reminder
   */
  async deleteReminder(familyId: string, reminderId: string): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'reminders', reminderId);
    await deleteDoc(docRef);
  }

  /**
   * Upload an attachment for an event
   */
  async uploadAttachment(
    familyId: string,
    eventId: string,
    file: File
  ): Promise<{ id: string; name: string; url: string; size: number }> {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `families/${familyId}/planner/${eventId}/attachments/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, path);

    const snapshot = await uploadBytesResumable(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);

    return {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: file.name,
      url,
      size: file.size,
    };
  }

  /**
   * Loads calendar settings from local storage or returns defaults
   */
  getCalendarSettings(familyId: string): CalendarSettings {
    const defaultSettings: CalendarSettings = {
      showBirthdays: true,
      showBills: true,
      showNotes: true,
      showUrgentNeeds: true,
      showSchool: true,
      showMedical: true,
      showReminders: true,
      defaultView: 'month',
      weekStartsOn: 0,
    };

    try {
      const saved = localStorage.getItem(`familyhub_calendar_settings_${familyId}`);
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return defaultSettings;
  }

  /**
   * Saves calendar settings to local storage
   */
  saveCalendarSettings(familyId: string, settings: CalendarSettings): void {
    try {
      localStorage.setItem(`familyhub_calendar_settings_${familyId}`, JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save calendar settings to localStorage:', e);
    }
  }

  /**
   * Creates an in-app notification with deduplication
   */
  private async createNotification(params: {
    recipientUserId: string;
    familyId: string;
    title: string;
    message: string;
  }): Promise<void> {
    try {
      const notifRef = doc(collection(db, 'notifications'));
      const notif: AppNotification = {
        id: notifRef.id,
        recipientUserId: params.recipientUserId,
        familyId: params.familyId,
        type: 'family_event',
        title: params.title,
        message: params.message,
        createdAt: new Date().toISOString(),
        readAt: null,
        relatedEntityType: 'event',
      };
      await setDoc(notifRef, notif);
    } catch (err) {
      console.warn('Could not send planner notification:', err);
    }
  }
}

export const eventService = new EventService();
