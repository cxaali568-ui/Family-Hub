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
import { NoteCategory, User } from '../types';
import { familyService } from './familyService';

export const DEFAULT_NOTE_CATEGORIES: Array<{
  id: string;
  name: string;
  icon: string;
  color?: string;
}> = [
  { id: 'home', name: 'Home', icon: 'Home', color: 'indigo' },
  { id: 'school', name: 'School', icon: 'GraduationCap', color: 'blue' },
  { id: 'medical', name: 'Medical', icon: 'HeartPulse', color: 'emerald' },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingCart', color: 'amber' },
  { id: 'documents', name: 'Documents', icon: 'FileText', color: 'purple' },
  { id: 'appointments', name: 'Appointments', icon: 'Calendar', color: 'sky' },
  { id: 'bills', name: 'Bills', icon: 'Receipt', color: 'teal' },
  { id: 'repairs', name: 'Repairs', icon: 'Wrench', color: 'orange' },
  { id: 'travel', name: 'Travel', icon: 'Plane', color: 'rose' },
  { id: 'family', name: 'Family', icon: 'Users', color: 'pink' },
  { id: 'other', name: 'Other', icon: 'Tag', color: 'slate' },
];

class NoteCategoryService {
  /**
   * Initializes default categories if none exist in the family
   */
  async initDefaultCategories(familyId: string, currentUser?: User): Promise<void> {
    if (!familyId) return;

    try {
      const colRef = collection(db, 'families', familyId, 'noteCategories');
      const snap = await getDocs(colRef);

      if (snap.empty) {
        const now = new Date().toISOString();
        const promises = DEFAULT_NOTE_CATEGORIES.map((def) => {
          const catDoc = doc(colRef, def.id);
          const data: NoteCategory = {
            id: def.id,
            familyId,
            name: def.name,
            icon: def.icon,
            color: def.color,
            active: true,
            isDefault: true,
            createdBy: currentUser?.id || 'system',
            createdAt: now,
            updatedAt: now,
          };
          return setDoc(catDoc, data);
        });

        await Promise.all(promises);
      }
    } catch (err) {
      console.warn('Failed to initialize default note categories:', err);
    }
  }

  /**
   * Subscribes to real-time note categories for a family
   */
  subscribeCategories(
    familyId: string,
    callback: (categories: NoteCategory[]) => void
  ): () => void {
    if (!familyId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'noteCategories');
    const q = query(colRef, where('active', '==', true));

    return onSnapshot(
      q,
      (snapshot) => {
        const categories: NoteCategory[] = [];
        snapshot.forEach((d) => {
          categories.push(d.data() as NoteCategory);
        });

        if (categories.length === 0) {
          // Fallback to static defaults if none in DB yet
          const now = new Date().toISOString();
          const fallback = DEFAULT_NOTE_CATEGORIES.map((def) => ({
            id: def.id,
            familyId,
            name: def.name,
            icon: def.icon,
            color: def.color,
            active: true,
            isDefault: true,
            createdBy: 'system',
            createdAt: now,
          }));
          callback(fallback);
        } else {
          callback(categories);
        }
      },
      (error) => {
        console.warn('Error fetching note categories, using default categories:', error);
        const now = new Date().toISOString();
        const fallback = DEFAULT_NOTE_CATEGORIES.map((def) => ({
          id: def.id,
          familyId,
          name: def.name,
          icon: def.icon,
          color: def.color,
          active: true,
          isDefault: true,
          createdBy: 'system',
          createdAt: now,
        }));
        callback(fallback);
      }
    );
  }

  /**
   * Adds a custom note category
   */
  async addCategory(
    familyId: string,
    name: string,
    icon: string = 'Tag',
    color: string = 'indigo',
    currentUser: User
  ): Promise<NoteCategory> {
    if (!familyId) throw new Error('Missing familyId');
    if (!name.trim()) throw new Error('Category name is required');

    const colRef = collection(db, 'families', familyId, 'noteCategories');
    const catId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const category: NoteCategory = {
      id: catId,
      familyId,
      name: name.trim(),
      icon,
      color,
      active: true,
      isDefault: false,
      createdBy: currentUser.id,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(colRef, catId), category);

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `Created note category: ${category.name}`,
      entityType: 'note_category',
      entityId: catId,
    });

    return category;
  }

  /**
   * Toggles category active state (archive category rather than deleting to protect historical notes)
   */
  async toggleCategoryActive(
    familyId: string,
    categoryId: string,
    active: boolean,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'noteCategories', categoryId);
    await updateDoc(docRef, {
      active,
      updatedAt: new Date().toISOString(),
    });

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `${active ? 'Activated' : 'Deactivated'} note category`,
      entityType: 'note_category',
      entityId: categoryId,
    });
  }
}

export const noteCategoryService = new NoteCategoryService();
