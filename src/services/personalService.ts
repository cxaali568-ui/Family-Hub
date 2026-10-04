import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import {
  PersonalProfile,
  PersonalExpense,
  PersonalSchoolWorkItem,
  PersonalNote,
  PersonalDailyNeed,
  PersonalPlan,
  PersonalReminder,
  PersonalFile,
  PersonalPhoto,
  PersonalAlbum,
  PersonalAIConversation,
  AIMessage,
} from '../types';

/**
 * Simple hash helper to avoid storing plaintext PINs
 */
const hashPin = (pin: string, salt: string = 'familyhub_personal_salt'): string => {
  let hash = 0;
  const str = `${salt}_${pin}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `ph_${Math.abs(hash).toString(16)}`;
};

class PersonalService {
  // -------------------------------------------------------------
  // 1. Personal Lock & Profile Management (Stored partitioned by ownerId)
  // -------------------------------------------------------------
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
      pinHash: hashPin('1234'),
      autoLockMinutes: 15,
    };
  }

  setLockEnabled(ownerId: string, enabled: boolean, pin?: string): void {
    const current = this.getProfile(ownerId);
    current.isLockEnabled = enabled;
    if (pin) {
      current.pinHash = hashPin(pin);
    }
    localStorage.setItem(`familyhub_lock_${ownerId}`, JSON.stringify(current));
  }

  verifyPin(ownerId: string, pin: string): boolean {
    const prof = this.getProfile(ownerId);
    if (!prof.isLockEnabled) return true;
    const computed = hashPin(pin);
    // Also allow default initial '1234' hash check
    return prof.pinHash === computed || prof.pinHash === hashPin('1234');
  }

  // -------------------------------------------------------------
  // 2. Personal Expenses (Strictly partitioned by ownerId)
  // -------------------------------------------------------------
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
        snap.forEach((d) => list.push(d.data() as PersonalExpense));
        callback(list);
      },
      (err) => {
        console.warn('Error listening to personal expenses:', err);
      }
    );
  }

  async addExpense(
    ownerId: string,
    expense: Omit<PersonalExpense, 'id' | 'ownerId'>
  ): Promise<PersonalExpense> {
    const docRef = doc(collection(db, 'personalExpenses'));
    const item: PersonalExpense = {
      id: docRef.id,
      ownerId,
      ...expense,
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, item);
    return item;
  }

  async updateExpense(
    ownerId: string,
    id: string,
    updates: Partial<PersonalExpense>
  ): Promise<void> {
    const docRef = doc(db, 'personalExpenses', id);
    await updateDoc(docRef, { ...updates });
  }

  async deleteExpense(ownerId: string, id: string): Promise<void> {
    await deleteDoc(doc(db, 'personalExpenses', id));
  }

  // -------------------------------------------------------------
  // 3. Personal School / Work (Strictly partitioned by ownerId)
  // -------------------------------------------------------------
  subscribeSchoolWork(
    ownerId: string,
    callback: (items: PersonalSchoolWorkItem[]) => void
  ): () => void {
    if (!ownerId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'personalSchoolWork'),
      where('ownerId', '==', ownerId),
      orderBy('date', 'asc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const list: PersonalSchoolWorkItem[] = [];
        snap.forEach((d) => list.push(d.data() as PersonalSchoolWorkItem));
        callback(list);
      },
      (err) => {
        console.warn('Error listening to personal school/work:', err);
      }
    );
  }

  async addSchoolWorkItem(
    ownerId: string,
    item: Omit<PersonalSchoolWorkItem, 'id' | 'ownerId' | 'createdAt'>
  ): Promise<PersonalSchoolWorkItem> {
    const docRef = doc(collection(db, 'personalSchoolWork'));
    const newItem: PersonalSchoolWorkItem = {
      id: docRef.id,
      ownerId,
      ...item,
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, newItem);
    return newItem;
  }

  async updateSchoolWorkItem(
    ownerId: string,
    id: string,
    updates: Partial<PersonalSchoolWorkItem>
  ): Promise<void> {
    const docRef = doc(db, 'personalSchoolWork', id);
    await updateDoc(docRef, { ...updates });
  }

  async deleteSchoolWorkItem(ownerId: string, id: string): Promise<void> {
    await deleteDoc(doc(db, 'personalSchoolWork', id));
  }

  // -------------------------------------------------------------
  // 4. Personal Notes & Notebook (Strictly partitioned by ownerId)
  // -------------------------------------------------------------
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
        snap.forEach((d) => list.push(d.data() as PersonalNote));
        callback(list);
      },
      (err) => {
        console.warn('Error listening to personal notes:', err);
      }
    );
  }

  async addNote(
    ownerId: string,
    note: Omit<PersonalNote, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ): Promise<PersonalNote> {
    const docRef = doc(collection(db, 'personalNotes'));
    const now = new Date().toISOString();
    const item: PersonalNote = {
      id: docRef.id,
      ownerId,
      ...note,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, item);
    return item;
  }

  async updateNote(ownerId: string, id: string, updates: Partial<PersonalNote>): Promise<void> {
    const docRef = doc(db, 'personalNotes', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteNote(ownerId: string, id: string): Promise<void> {
    await deleteDoc(doc(db, 'personalNotes', id));
  }

  // -------------------------------------------------------------
  // 5. Personal Daily Needs (Strictly partitioned by ownerId)
  // -------------------------------------------------------------
  subscribeDailyNeeds(
    ownerId: string,
    callback: (needs: PersonalDailyNeed[]) => void
  ): () => void {
    if (!ownerId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'personalNeeds'),
      where('ownerId', '==', ownerId),
      orderBy('dueDate', 'asc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const list: PersonalDailyNeed[] = [];
        snap.forEach((d) => list.push(d.data() as PersonalDailyNeed));
        callback(list);
      },
      (err) => {
        console.warn('Error listening to personal daily needs:', err);
      }
    );
  }

  async addDailyNeed(
    ownerId: string,
    need: Omit<PersonalDailyNeed, 'id' | 'ownerId' | 'assignedTo' | 'createdAt'>
  ): Promise<PersonalDailyNeed> {
    const docRef = doc(collection(db, 'personalNeeds'));
    const item: PersonalDailyNeed = {
      id: docRef.id,
      ownerId,
      assignedTo: ownerId, // Strictly self-assigned in Personal Space
      ...need,
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, item);
    return item;
  }

  async updateDailyNeed(
    ownerId: string,
    id: string,
    updates: Partial<PersonalDailyNeed>
  ): Promise<void> {
    const docRef = doc(db, 'personalNeeds', id);
    await updateDoc(docRef, updates);
  }

  async deleteDailyNeed(ownerId: string, id: string): Promise<void> {
    await deleteDoc(doc(db, 'personalNeeds', id));
  }

  // -------------------------------------------------------------
  // 6. Personal Plans (Strictly partitioned by ownerId)
  // -------------------------------------------------------------
  subscribePlans(ownerId: string, callback: (plans: PersonalPlan[]) => void): () => void {
    if (!ownerId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'personalPlans'),
      where('ownerId', '==', ownerId),
      orderBy('startDate', 'asc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const list: PersonalPlan[] = [];
        snap.forEach((d) => list.push(d.data() as PersonalPlan));
        callback(list);
      },
      (err) => {
        console.warn('Error listening to personal plans:', err);
      }
    );
  }

  async addPlan(
    ownerId: string,
    plan: Omit<PersonalPlan, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ): Promise<PersonalPlan> {
    const docRef = doc(collection(db, 'personalPlans'));
    const now = new Date().toISOString();
    const item: PersonalPlan = {
      id: docRef.id,
      ownerId,
      ...plan,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, item);
    return item;
  }

  async updatePlan(ownerId: string, id: string, updates: Partial<PersonalPlan>): Promise<void> {
    const docRef = doc(db, 'personalPlans', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async deletePlan(ownerId: string, id: string): Promise<void> {
    await deleteDoc(doc(db, 'personalPlans', id));
  }

  // -------------------------------------------------------------
  // 7. Personal Reminders (Strictly partitioned by ownerId)
  // -------------------------------------------------------------
  subscribeReminders(
    ownerId: string,
    callback: (reminders: PersonalReminder[]) => void
  ): () => void {
    if (!ownerId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'personalReminders'),
      where('ownerId', '==', ownerId),
      orderBy('date', 'asc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const list: PersonalReminder[] = [];
        snap.forEach((d) => list.push(d.data() as PersonalReminder));
        callback(list);
      },
      (err) => {
        console.warn('Error listening to personal reminders:', err);
      }
    );
  }

  async addReminder(
    ownerId: string,
    reminder: Omit<PersonalReminder, 'id' | 'ownerId' | 'createdAt'>
  ): Promise<PersonalReminder> {
    const docRef = doc(collection(db, 'personalReminders'));
    const item: PersonalReminder = {
      id: docRef.id,
      ownerId,
      ...reminder,
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, item);
    return item;
  }

  async updateReminder(
    ownerId: string,
    id: string,
    updates: Partial<PersonalReminder>
  ): Promise<void> {
    const docRef = doc(db, 'personalReminders', id);
    await updateDoc(docRef, updates);
  }

  async deleteReminder(ownerId: string, id: string): Promise<void> {
    await deleteDoc(doc(db, 'personalReminders', id));
  }

  // -------------------------------------------------------------
  // 8. Personal Documents & Files (Private Firebase Storage)
  // -------------------------------------------------------------
  subscribeFiles(ownerId: string, callback: (files: PersonalFile[]) => void): () => void {
    if (!ownerId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'personalFiles'),
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const list: PersonalFile[] = [];
        snap.forEach((d) => list.push(d.data() as PersonalFile));
        callback(list);
      },
      (err) => {
        console.warn('Error listening to personal files:', err);
      }
    );
  }

  async uploadFile(
    ownerId: string,
    file: File,
    category: PersonalFile['category'] = 'documents'
  ): Promise<PersonalFile> {
    const docRef = doc(collection(db, 'personalFiles'));
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `users/${ownerId}/personal/documents/${docRef.id}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = await uploadBytesResumable(storageRef, file);
    const url = await getDownloadURL(uploadTask.ref);

    const now = new Date().toISOString();
    const item: PersonalFile = {
      id: docRef.id,
      ownerId,
      name: file.name,
      fileType: file.type || 'application/octet-stream',
      size: file.size,
      storagePath,
      url,
      category,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, item);
    return item;
  }

  async renameFile(ownerId: string, id: string, newName: string): Promise<void> {
    const docRef = doc(db, 'personalFiles', id);
    await updateDoc(docRef, {
      name: newName,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteFile(ownerId: string, id: string, storagePath?: string): Promise<void> {
    await deleteDoc(doc(db, 'personalFiles', id));
    if (storagePath) {
      try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      } catch (e) {
        console.warn('Could not delete storage file:', e);
      }
    }
  }

  // -------------------------------------------------------------
  // 9. Personal Photos & Albums (Private Firebase Storage)
  // -------------------------------------------------------------
  subscribePhotos(ownerId: string, callback: (photos: PersonalPhoto[]) => void): () => void {
    if (!ownerId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'personalPhotos'),
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const list: PersonalPhoto[] = [];
        snap.forEach((d) => list.push(d.data() as PersonalPhoto));
        callback(list);
      },
      (err) => {
        console.warn('Error listening to personal photos:', err);
      }
    );
  }

  subscribeAlbums(ownerId: string, callback: (albums: PersonalAlbum[]) => void): () => void {
    if (!ownerId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'personalAlbums'),
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const list: PersonalAlbum[] = [];
        snap.forEach((d) => list.push(d.data() as PersonalAlbum));
        callback(list);
      },
      (err) => {
        console.warn('Error listening to personal albums:', err);
      }
    );
  }

  async uploadPhoto(
    ownerId: string,
    file: File,
    albumId?: string,
    caption?: string
  ): Promise<PersonalPhoto> {
    const docRef = doc(collection(db, 'personalPhotos'));
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `users/${ownerId}/personal/photos/${docRef.id}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    const snapshot = await uploadBytesResumable(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);

    const photo: PersonalPhoto = {
      id: docRef.id,
      ownerId,
      albumId: albumId || undefined,
      url,
      storagePath,
      name: file.name,
      size: file.size,
      caption: caption || undefined,
      createdAt: new Date().toISOString(),
    };

    await setDoc(docRef, photo);
    return photo;
  }

  async createAlbum(ownerId: string, title: string, description?: string): Promise<PersonalAlbum> {
    const docRef = doc(collection(db, 'personalAlbums'));
    const album: PersonalAlbum = {
      id: docRef.id,
      ownerId,
      title: title.trim(),
      description: description?.trim() || undefined,
      photoCount: 0,
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, album);
    return album;
  }

  async deletePhoto(ownerId: string, id: string, storagePath?: string): Promise<void> {
    await deleteDoc(doc(db, 'personalPhotos', id));
    if (storagePath) {
      try {
        await deleteObject(ref(storage, storagePath));
      } catch (e) {
        console.warn('Could not delete storage photo:', e);
      }
    }
  }

  async deleteAlbum(ownerId: string, albumId: string): Promise<void> {
    await deleteDoc(doc(db, 'personalAlbums', albumId));
  }

  // -------------------------------------------------------------
  // 10. Personal AI Conversations (Strictly partitioned by ownerId)
  // -------------------------------------------------------------
  subscribeAIConversations(
    ownerId: string,
    callback: (convs: PersonalAIConversation[]) => void
  ): () => void {
    if (!ownerId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'personalAIConversations'),
      where('ownerId', '==', ownerId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(
      q,
      (snap) => {
        const list: PersonalAIConversation[] = [];
        snap.forEach((d) => list.push(d.data() as PersonalAIConversation));
        callback(list);
      },
      (err) => {
        console.warn('Error listening to personal AI conversations:', err);
      }
    );
  }

  async createAIConversation(
    ownerId: string,
    title: string,
    messages: AIMessage[]
  ): Promise<PersonalAIConversation> {
    const docRef = doc(collection(db, 'personalAIConversations'));
    const now = new Date().toISOString();
    const conv: PersonalAIConversation = {
      id: docRef.id,
      ownerId,
      title: title || 'New Conversation',
      messages,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, conv);
    return conv;
  }

  async updateAIConversation(
    ownerId: string,
    id: string,
    updates: Partial<PersonalAIConversation>
  ): Promise<void> {
    const docRef = doc(db, 'personalAIConversations', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteAIConversation(ownerId: string, id: string): Promise<void> {
    await deleteDoc(doc(db, 'personalAIConversations', id));
  }

  // -------------------------------------------------------------
  // 11. Calculations & Reports
  // -------------------------------------------------------------
  calculateExpenseStats(expenses: PersonalExpense[]) {
    const todayStr = new Date().toISOString().split('T')[0];

    // Compute week start (7 days ago)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    // Compute month start
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    let totalSpending = 0;
    let todaySpending = 0;
    let weekSpending = 0;
    let monthSpending = 0;
    let largestExpense: PersonalExpense | null = null;
    const categoryTotals: Record<string, number> = {};

    for (const exp of expenses) {
      const amt = Number(exp.amount) || 0;
      totalSpending += amt;

      if (exp.date === todayStr) {
        todaySpending += amt;
      }
      if (exp.date >= weekAgoStr) {
        weekSpending += amt;
      }
      if (exp.date >= monthStartStr) {
        monthSpending += amt;
      }

      if (!largestExpense || amt > largestExpense.amount) {
        largestExpense = exp;
      }

      const cat = exp.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    }

    return {
      totalSpending,
      todaySpending,
      weekSpending,
      monthSpending,
      count: expenses.length,
      largestExpense,
      categoryTotals,
    };
  }

  // -------------------------------------------------------------
  // 12. Full Personal Data Export
  // -------------------------------------------------------------
  async exportPersonalData(ownerId: string): Promise<Record<string, any>> {
    const [expensesSnap, notesSnap, schoolSnap, needsSnap, plansSnap, remindersSnap, filesSnap] =
      await Promise.all([
        getDocs(query(collection(db, 'personalExpenses'), where('ownerId', '==', ownerId))),
        getDocs(query(collection(db, 'personalNotes'), where('ownerId', '==', ownerId))),
        getDocs(query(collection(db, 'personalSchoolWork'), where('ownerId', '==', ownerId))),
        getDocs(query(collection(db, 'personalNeeds'), where('ownerId', '==', ownerId))),
        getDocs(query(collection(db, 'personalPlans'), where('ownerId', '==', ownerId))),
        getDocs(query(collection(db, 'personalReminders'), where('ownerId', '==', ownerId))),
        getDocs(query(collection(db, 'personalFiles'), where('ownerId', '==', ownerId))),
      ]);

    return {
      exportDate: new Date().toISOString(),
      ownerId,
      expenses: expensesSnap.docs.map((d) => d.data()),
      notes: notesSnap.docs.map((d) => d.data()),
      schoolWork: schoolSnap.docs.map((d) => d.data()),
      dailyNeeds: needsSnap.docs.map((d) => d.data()),
      plans: plansSnap.docs.map((d) => d.data()),
      reminders: remindersSnap.docs.map((d) => d.data()),
      files: filesSnap.docs.map((d) => d.data()),
    };
  }
}

export const personalService = new PersonalService();
