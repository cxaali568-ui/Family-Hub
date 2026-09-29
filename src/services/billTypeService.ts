import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BillType, User } from '../types';
import { familyService } from './familyService';

export const DEFAULT_BILL_TYPES: Array<{
  name: string;
  icon: string;
  color?: string;
}> = [
  { name: 'Electricity', icon: 'Zap', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/60' },
  { name: 'Gas', icon: 'Flame', color: 'text-red-500 bg-red-50 dark:bg-red-950/60' },
  { name: 'Water', icon: 'Droplets', color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/60' },
  { name: 'Internet', icon: 'Wifi', color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/60' },
  { name: 'Mobile / Phone', icon: 'Phone', color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/60' },
  { name: 'Rent', icon: 'Home', color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/60' },
  { name: 'School', icon: 'GraduationCap', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/60' },
  { name: 'Insurance', icon: 'Shield', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60' },
  { name: 'Subscription', icon: 'Film', color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/60' },
  { name: 'Other', icon: 'Package', color: 'text-slate-500 bg-slate-50 dark:bg-slate-800' },
];

class BillTypeService {
  /**
   * Ensures standard bill types exist in Firestore for this family.
   */
  async ensureDefaultBillTypes(familyId: string, userId: string): Promise<void> {
    if (!familyId) return;
    try {
      const colRef = collection(db, 'families', familyId, 'billTypes');
      const snap = await getDocs(colRef);
      if (!snap.empty) return;

      const now = new Date().toISOString();
      const batchPromises = DEFAULT_BILL_TYPES.map((bt) => {
        const typeId = `type_${bt.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const docRef = doc(db, 'families', familyId, 'billTypes', typeId);
        const data: BillType = {
          id: typeId,
          familyId,
          name: bt.name,
          icon: bt.icon,
          color: bt.color,
          active: true,
          isCustom: false,
          createdAt: now,
          updatedAt: now,
        };
        return setDoc(docRef, data);
      });

      await Promise.all(batchPromises);
    } catch (err) {
      console.warn('Could not populate default bill types:', err);
    }
  }

  /**
   * Subscribes to real-time bill types for a family.
   */
  subscribeBillTypes(
    familyId: string,
    callback: (types: BillType[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!familyId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'billTypes');
    const q = query(colRef, where('active', '==', true));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: BillType[] = [];
        snapshot.forEach((d) => list.push(d.data() as BillType));
        list.sort((a, b) => {
          if (a.isCustom === b.isCustom) return a.name.localeCompare(b.name);
          return a.isCustom ? 1 : -1;
        });
        callback(list);
      },
      (err) => {
        console.warn('Error subscribing to bill types:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Adds a custom bill type.
   */
  async addCustomBillType(
    familyId: string,
    data: { name: string; icon?: string; color?: string },
    currentUser: User
  ): Promise<BillType> {
    const colRef = collection(db, 'families', familyId, 'billTypes');
    const newDoc = doc(colRef);
    const now = new Date().toISOString();

    const customType: BillType = {
      id: newDoc.id,
      familyId,
      name: data.name.trim(),
      icon: data.icon || 'Tag',
      color: data.color || 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60',
      active: true,
      isCustom: true,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(newDoc, customType);

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `created custom bill type "${customType.name}"`,
      entityType: 'expense',
      entityId: customType.id,
    });

    return customType;
  }

  /**
   * Deactivates a bill type without breaking historical records.
   */
  async deactivateBillType(
    familyId: string,
    typeId: string,
    typeName: string,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'billTypes', typeId);
    await updateDoc(docRef, {
      active: false,
      updatedAt: new Date().toISOString(),
    });

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `archived bill type "${typeName}"`,
      entityType: 'expense',
      entityId: typeId,
    });
  }
}

export const billTypeService = new BillTypeService();
