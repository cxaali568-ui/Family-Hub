import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FamilyBudget, User } from '../types';
import { familyService } from './familyService';

class BudgetService {
  /**
   * Retrieves the budget for a specific month (e.g. 2026-09).
   */
  async getBudget(familyId: string, monthKey: string): Promise<FamilyBudget | null> {
    if (!familyId || !monthKey) return null;
    const docId = `budget_${monthKey.replace('-', '_')}`;
    const docRef = doc(db, 'families', familyId, 'budgets', docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as FamilyBudget;
  }

  /**
   * Subscribes to the budget for a specific month.
   */
  subscribeBudget(
    familyId: string,
    monthKey: string,
    callback: (budget: FamilyBudget | null) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!familyId || !monthKey) {
      callback(null);
      return () => {};
    }

    const docId = `budget_${monthKey.replace('-', '_')}`;
    const docRef = doc(db, 'families', familyId, 'budgets', docId);

    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as FamilyBudget);
        } else {
          callback(null);
        }
      },
      (err) => {
        console.warn('Error subscribing to budget:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Sets or updates monthly budget for the given year and month.
   */
  async setBudget(
    familyId: string,
    year: number,
    month: number,
    amount: number,
    currentUser: User,
    currency: string = 'PKR'
  ): Promise<FamilyBudget> {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const docId = `budget_${monthKey.replace('-', '_')}`;
    const docRef = doc(db, 'families', familyId, 'budgets', docId);
    const now = new Date().toISOString();

    const budget: FamilyBudget = {
      id: docId,
      familyId,
      year,
      month,
      monthKey,
      amount: Math.max(0, Number(amount) || 0),
      currency,
      createdBy: currentUser.id,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, budget, { merge: true });

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `set monthly expense budget to ${currency} ${budget.amount.toLocaleString()} for ${monthKey}`,
      entityType: 'expense',
      entityId: docId,
    });

    return budget;
  }
}

export const budgetService = new BudgetService();
