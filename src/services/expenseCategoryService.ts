import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ExpenseCategory, User } from '../types';
import { familyService } from './familyService';

export const DEFAULT_EXPENSE_CATEGORIES: Array<{
  name: string;
  icon: string;
  color?: string;
}> = [
  { name: 'Food', icon: 'Utensils', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/60' },
  { name: 'Groceries', icon: 'ShoppingCart', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60' },
  { name: 'School', icon: 'GraduationCap', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/60' },
  { name: 'Medical', icon: 'HeartPulse', color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/60' },
  { name: 'Transport', icon: 'Car', color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60' },
  { name: 'Fuel', icon: 'Fuel', color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/60' },
  { name: 'Electricity', icon: 'Zap', color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/60' },
  { name: 'Gas', icon: 'Flame', color: 'text-red-500 bg-red-50 dark:bg-red-950/60' },
  { name: 'Water', icon: 'Droplets', color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/60' },
  { name: 'Internet', icon: 'Wifi', color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/60' },
  { name: 'Phone', icon: 'Phone', color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/60' },
  { name: 'Rent', icon: 'Home', color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/60' },
  { name: 'Household', icon: 'Sofa', color: 'text-slate-500 bg-slate-50 dark:bg-slate-800' },
  { name: 'Clothing', icon: 'Shirt', color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/60' },
  { name: 'Education', icon: 'BookOpen', color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/60' },
  { name: 'Children', icon: 'Baby', color: 'text-lime-600 bg-lime-50 dark:bg-lime-950/60' },
  { name: 'Medicine', icon: 'Pill', color: 'text-red-600 bg-red-50 dark:bg-red-950/60' },
  { name: 'Entertainment', icon: 'Film', color: 'text-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/60' },
  { name: 'Travel', icon: 'Plane', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60' },
  { name: 'Repairs', icon: 'Wrench', color: 'text-stone-500 bg-stone-50 dark:bg-stone-800' },
  { name: 'Gifts', icon: 'Gift', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60' },
  { name: 'Other', icon: 'Package', color: 'text-gray-500 bg-gray-50 dark:bg-gray-800' },
];

class ExpenseCategoryService {
  /**
   * Ensures default categories exist in Firestore for this family.
   */
  async ensureDefaultCategories(familyId: string, userId: string): Promise<void> {
    if (!familyId) return;
    try {
      const colRef = collection(db, 'families', familyId, 'expenseCategories');
      const snap = await getDocs(colRef);
      if (!snap.empty) return;

      const now = new Date().toISOString();
      const batchPromises = DEFAULT_EXPENSE_CATEGORIES.map((cat, idx) => {
        const catId = `cat_${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const docRef = doc(db, 'families', familyId, 'expenseCategories', catId);
        const data: ExpenseCategory = {
          id: catId,
          familyId,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          active: true,
          isCustom: false,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
        };
        return setDoc(docRef, data);
      });

      await Promise.all(batchPromises);
    } catch (err) {
      console.warn('Could not populate default expense categories:', err);
    }
  }

  /**
   * Subscribes to real-time categories for a family.
   */
  subscribeCategories(
    familyId: string,
    callback: (categories: ExpenseCategory[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!familyId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'expenseCategories');
    const q = query(colRef, where('active', '==', true));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: ExpenseCategory[] = [];
        snapshot.forEach((d) => list.push(d.data() as ExpenseCategory));
        // Sort: default categories first in original order, then custom categories alphabetically
        list.sort((a, b) => {
          if (a.isCustom === b.isCustom) return a.name.localeCompare(b.name);
          return a.isCustom ? 1 : -1;
        });
        callback(list);
      },
      (err) => {
        console.warn('Error subscribing to expense categories:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Adds a new custom category.
   */
  async addCategory(
    familyId: string,
    data: { name: string; icon?: string; color?: string },
    currentUser: User
  ): Promise<ExpenseCategory> {
    const colRef = collection(db, 'families', familyId, 'expenseCategories');
    const newDoc = doc(colRef);
    const now = new Date().toISOString();

    const category: ExpenseCategory = {
      id: newDoc.id,
      familyId,
      name: data.name.trim(),
      icon: data.icon || 'Tag',
      color: data.color || 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60',
      active: true,
      isCustom: true,
      createdBy: currentUser.id,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(newDoc, category);

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `created custom expense category "${category.name}"`,
      entityType: 'expense',
      entityId: category.id,
    });

    return category;
  }

  /**
   * Deactivates a category (never hard deletes if used by past expenses).
   */
  async deactivateCategory(
    familyId: string,
    categoryId: string,
    categoryName: string,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'expenseCategories', categoryId);
    await updateDoc(docRef, {
      active: false,
      updatedAt: new Date().toISOString(),
    });

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `archived expense category "${categoryName}"`,
      entityType: 'expense',
      entityId: categoryId,
    });
  }
}

export const expenseCategoryService = new ExpenseCategoryService();
