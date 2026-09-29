import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BillTemplate, BillFrequency, User } from '../types';
import { familyService } from './familyService';

export const computeNextDueDate = (
  currentDueDate: string,
  frequency: BillFrequency,
  customIntervalDays: number = 30
): string => {
  const [yearStr, monthStr, dayStr] = currentDueDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12
  const day = parseInt(dayStr, 10);

  if (frequency === 'monthly') {
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    const daysInNextMonth = new Date(nextYear, nextMonth, 0).getDate();
    const safeDay = Math.min(day, daysInNextMonth);
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
  }

  if (frequency === 'bimonthly') {
    let nextMonth = month + 2;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth -= 12;
      nextYear += 1;
    }
    const daysInNextMonth = new Date(nextYear, nextMonth, 0).getDate();
    const safeDay = Math.min(day, daysInNextMonth);
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
  }

  if (frequency === 'quarterly') {
    let nextMonth = month + 3;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth -= 12;
      nextYear += 1;
    }
    const daysInNextMonth = new Date(nextYear, nextMonth, 0).getDate();
    const safeDay = Math.min(day, daysInNextMonth);
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
  }

  if (frequency === 'semiannual') {
    let nextMonth = month + 6;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth -= 12;
      nextYear += 1;
    }
    const daysInNextMonth = new Date(nextYear, nextMonth, 0).getDate();
    const safeDay = Math.min(day, daysInNextMonth);
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
  }

  if (frequency === 'yearly') {
    const nextYear = year + 1;
    const daysInNextMonth = new Date(nextYear, month, 0).getDate();
    const safeDay = Math.min(day, daysInNextMonth);
    return `${nextYear}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
  }

  // Custom interval days
  const baseDate = new Date(Date.UTC(year, month - 1, day));
  baseDate.setUTCDate(baseDate.getUTCDate() + (customIntervalDays || 30));
  return baseDate.toISOString().split('T')[0];
};

class BillTemplateService {
  /**
   * Subscribes to all recurring templates for a family.
   */
  subscribeTemplates(
    familyId: string,
    callback: (templates: BillTemplate[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!familyId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'billTemplates');

    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: BillTemplate[] = [];
        snapshot.forEach((d) => list.push(d.data() as BillTemplate));
        list.sort((a, b) => a.providerName.localeCompare(b.providerName));
        callback(list);
      },
      (err) => {
        console.warn('Error subscribing to bill templates:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Creates a new recurring bill template.
   */
  async createTemplate(
    familyId: string,
    data: Omit<BillTemplate, 'id' | 'familyId' | 'active' | 'createdBy' | 'createdAt' | 'updatedAt'>,
    currentUser: User
  ): Promise<BillTemplate> {
    const colRef = collection(db, 'families', familyId, 'billTemplates');
    const newDoc = doc(colRef);
    const now = new Date().toISOString();

    const template: BillTemplate = {
      ...data,
      id: newDoc.id,
      familyId,
      active: true,
      createdBy: currentUser.id,
      createdAt: now,
      updatedAt: now,
    };

    const clean: any = { ...template };
    Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);

    await setDoc(newDoc, clean);

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `configured recurring bill schedule for "${template.providerName}" (${template.billTypeName})`,
      entityType: 'expense',
      entityId: template.id,
    });

    return template;
  }

  /**
   * Pauses a recurring bill template (Section 34).
   */
  async pauseTemplate(familyId: string, templateId: string, providerName: string, currentUser: User): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'billTemplates', templateId);
    await updateDoc(docRef, {
      active: false,
      updatedAt: new Date().toISOString(),
    });

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `paused recurring bill schedule for "${providerName}"`,
      entityType: 'expense',
      entityId: templateId,
    });
  }

  /**
   * Resumes a paused recurring bill template.
   */
  async resumeTemplate(familyId: string, templateId: string, providerName: string, currentUser: User): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'billTemplates', templateId);
    await updateDoc(docRef, {
      active: true,
      updatedAt: new Date().toISOString(),
    });

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `resumed recurring bill schedule for "${providerName}"`,
      entityType: 'expense',
      entityId: templateId,
    });
  }

  /**
   * Updates template settings.
   */
  async updateTemplate(
    familyId: string,
    templateId: string,
    updates: Partial<BillTemplate>,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'billTemplates', templateId);
    const clean: any = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);

    await updateDoc(docRef, clean);

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `updated recurring bill schedule for "${updates.providerName || 'bill'}"`,
      entityType: 'expense',
      entityId: templateId,
    });
  }
}

export const billTemplateService = new BillTemplateService();
