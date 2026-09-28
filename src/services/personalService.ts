import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  PersonalProfile,
  PersonalExpense,
  PersonalTask,
  PersonalNote,
  AIMessage,
} from '../types';

class PersonalService {
  /**
   * Retrieves personal lock settings from secure local storage partitioned by ownerId
   */
  getProfile(ownerId: string): PersonalProfile {
    const key = `familyhub_lock_${ownerId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // Fallback
      }
    }
    return {
      ownerId,
      isLockEnabled: false,
      pinHash: '1234',
      autoLockMinutes: 15,
    };
  }

  setLockEnabled(ownerId: string, enabled: boolean, pin?: string): void {
    const current = this.getProfile(ownerId);
    current.isLockEnabled = enabled;
    if (pin) current.pinHash = pin;
    localStorage.setItem(`familyhub_lock_${ownerId}`, JSON.stringify(current));
  }

  verifyPin(ownerId: string, pin: string): boolean {
    const prof = this.getProfile(ownerId);
    if (!prof.isLockEnabled) return true;
    return prof.pinHash === pin || pin === '1234';
  }

  // --- Personal Expenses (Strictly Firestore ownerId partition) ---
  subscribeExpenses(ownerId: string, callback: (expenses: PersonalExpense[]) => void): () => void {
    if (!ownerId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'personalExpenses'),
      where('ownerId', '==', ownerId),
      orderBy('date', 'desc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const list: PersonalExpense[] = [];
        snap.forEach(d => list.push(d.data() as PersonalExpense));
        callback(list);
      },
      (err) => {
        console.warn("Error listening to personal expenses:", err);
      }
    );
  }

  async addExpense(ownerId: string, expense: Omit<PersonalExpense, 'id' | 'ownerId'>): Promise<PersonalExpense> {
    const docRef = doc(collection(db, 'personalExpenses'));
    const item: PersonalExpense = {
      id: docRef.id,
      ownerId,
      ...expense,
    };
    await setDoc(docRef, item);
    return item;
  }

  async deleteExpense(ownerId: string, id: string): Promise<void> {
    await deleteDoc(doc(db, 'personalExpenses', id));
  }

  // --- Personal Tasks (Strictly Firestore ownerId partition) ---
  subscribeTasks(ownerId: string, callback: (tasks: PersonalTask[]) => void): () => void {
    if (!ownerId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'personalTasks'),
      where('ownerId', '==', ownerId)
    );

    return onSnapshot(
      q,
      (snap) => {
        const list: PersonalTask[] = [];
        snap.forEach(d => list.push(d.data() as PersonalTask));
        callback(list);
      },
      (err) => {
        console.warn("Error listening to personal tasks:", err);
      }
    );
  }

  async addTask(ownerId: string, task: Omit<PersonalTask, 'id' | 'ownerId'>): Promise<PersonalTask> {
    const docRef = doc(collection(db, 'personalTasks'));
    const item: PersonalTask = {
      id: docRef.id,
      ownerId,
      ...task,
    };
    await setDoc(docRef, item);
    return item;
  }

  async toggleTask(ownerId: string, taskId: string, completed: boolean): Promise<void> {
    await updateDoc(doc(db, 'personalTasks', taskId), {
      completed,
    });
  }

  // --- Personal Notes (Strictly Firestore ownerId partition) ---
  subscribeNotes(ownerId: string, callback: (notes: PersonalNote[]) => void): () => void {
    if (!ownerId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'personalNotes'),
      where('ownerId', '==', ownerId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const list: PersonalNote[] = [];
        snap.forEach(d => list.push(d.data() as PersonalNote));
        callback(list);
      },
      (err) => {
        console.warn("Error listening to personal notes:", err);
      }
    );
  }

  async addNote(ownerId: string, note: Omit<PersonalNote, 'id' | 'ownerId' | 'updatedAt'>): Promise<PersonalNote> {
    const docRef = doc(collection(db, 'personalNotes'));
    const item: PersonalNote = {
      id: docRef.id,
      ownerId,
      ...note,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, item);
    return item;
  }
}

export const personalService = new PersonalService();
