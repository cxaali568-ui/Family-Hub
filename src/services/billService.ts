import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bill, BillTemplate, BillType, User } from '../types';
import { familyService } from './familyService';
import { billTemplateService } from './billTemplateService';

export const maskAccountNumber = (acc?: string): string => {
  if (!acc || acc.trim().length === 0) return '';
  const trimmed = acc.trim();
  if (trimmed.length <= 4) return `****${trimmed}`;
  const lastFour = trimmed.slice(-4);
  return `****${lastFour}`;
};

class BillService {
  /**
   * Subscribes to real-time bills for a specific month (based on billingMonthKey).
   */
  subscribeMonthBills(
    familyId: string,
    monthKey: string,
    callback: (bills: Bill[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!familyId || !monthKey) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'bills');
    const q = query(colRef, where('billingMonthKey', '==', monthKey));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: Bill[] = [];
        const todayStr = new Date().toISOString().split('T')[0];

        snapshot.forEach((d) => {
          const item = d.data() as Bill;
          // Check if overdue
          if (
            (item.status === 'Pending' || item.status === 'Partially Paid') &&
            item.dueDate < todayStr
          ) {
            item.status = 'Overdue';
            // Non-blocking background sync
            updateDoc(d.ref, { status: 'Overdue', updatedAt: new Date().toISOString() }).catch(() => {});
          }
          list.push(item);
        });

        list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        callback(list);
      },
      (err) => {
        console.warn('Error subscribing to month bills:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Subscribes to all active bills across all months (for overdue, today, and upcoming calculations).
   */
  subscribeAllActiveBills(
    familyId: string,
    callback: (bills: Bill[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!familyId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'bills');

    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: Bill[] = [];
        const todayStr = new Date().toISOString().split('T')[0];

        snapshot.forEach((d) => {
          const item = d.data() as Bill;
          if (
            (item.status === 'Pending' || item.status === 'Partially Paid') &&
            item.dueDate < todayStr
          ) {
            item.status = 'Overdue';
            updateDoc(d.ref, { status: 'Overdue', updatedAt: new Date().toISOString() }).catch(() => {});
          }
          list.push(item);
        });

        list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        callback(list);
      },
      (err) => {
        console.warn('Error subscribing to all bills:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Adds a new bill. If recurring is chosen, creates both recurring template and the first instance.
   */
  async addBill(
    familyId: string,
    data: {
      billTypeId: string;
      billTypeName: string;
      billTypeIcon?: string;
      providerName: string;
      amount: number;
      currency?: string;
      dueDate: string; // YYYY-MM-DD
      accountNumber?: string;
      referenceNumber?: string;
      notes?: string;
      isRecurring?: boolean;
      recurringFrequency?: BillTemplate['frequency'];
      amountType?: 'fixed' | 'variable';
    },
    currentUser: User
  ): Promise<Bill> {
    if (!familyId) throw new Error('Family ID is required');

    const numAmount = Number(data.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Bill amount must be a positive number greater than 0.');
    }

    if (!data.providerName?.trim()) {
      throw new Error('Please enter the provider or company name.');
    }

    if (!data.dueDate) {
      throw new Error('Please select a due date.');
    }

    const [yearStr, monthStr] = data.dueDate.split('-');
    const billingMonthKey = `${yearStr}-${monthStr}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const initialStatus = data.dueDate < todayStr ? 'Overdue' : 'Pending';
    const amountMinor = Math.round(numAmount * 100);

    const maskedAcc = maskAccountNumber(data.accountNumber);
    const fullAcc = data.accountNumber?.trim() || undefined;

    let templateId: string | undefined;

    // Section 14, 17: If recurring, create template first
    if (data.isRecurring && data.recurringFrequency) {
      const template = await billTemplateService.createTemplate(
        familyId,
        {
          billTypeId: data.billTypeId,
          billTypeName: data.billTypeName,
          billTypeIcon: data.billTypeIcon,
          providerName: data.providerName.trim(),
          amountType: data.amountType || 'fixed',
          defaultAmount: numAmount,
          frequency: data.recurringFrequency,
          startDate: data.dueDate,
          nextDueDate: data.dueDate,
          accountNumberMasked: maskedAcc || undefined,
          accountNumberFull: fullAcc,
          referenceNumber: data.referenceNumber?.trim() || undefined,
          notes: data.notes?.trim() || undefined,
        },
        currentUser
      );
      templateId = template.id;
    }

    const colRef = collection(db, 'families', familyId, 'bills');
    const newDoc = doc(colRef);
    const now = new Date().toISOString();

    const bill: Bill = {
      id: newDoc.id,
      familyId,
      templateId,
      billTypeId: data.billTypeId,
      billTypeName: data.billTypeName,
      billTypeIcon: data.billTypeIcon,
      providerName: data.providerName.trim(),
      amount: numAmount,
      amountMinor,
      paidAmount: 0,
      remainingAmount: numAmount,
      currency: data.currency || 'PKR',
      dueDate: data.dueDate,
      billingMonthKey,
      status: initialStatus,
      accountNumberMasked: maskedAcc || undefined,
      accountNumberFull: fullAcc,
      referenceNumber: data.referenceNumber?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      isRecurringInstance: Boolean(data.isRecurring),
      frequency: data.recurringFrequency,
      createdBy: currentUser.id,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      cancelledBy: null,
    };

    const clean: any = { ...bill };
    Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);

    await setDoc(newDoc, clean);

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `added bill for "${bill.providerName}" (${bill.billTypeName}, ${bill.currency} ${bill.amount.toLocaleString()} due ${bill.dueDate})`,
      entityType: 'expense',
      entityId: bill.id,
    });

    return bill;
  }

  /**
   * Updates an existing bill instance.
   */
  async updateBill(
    familyId: string,
    billId: string,
    updates: Partial<Bill>,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'bills', billId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Bill not found');

    const cur = snap.data() as Bill;
    const cleanUpdates: any = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.accountNumberFull) {
      cleanUpdates.accountNumberMasked = maskAccountNumber(updates.accountNumberFull);
    }

    if (updates.amount !== undefined) {
      const numAmt = Number(updates.amount);
      if (isNaN(numAmt) || numAmt <= 0) throw new Error('Amount must be positive');
      cleanUpdates.amount = numAmt;
      cleanUpdates.amountMinor = Math.round(numAmt * 100);
      const paid = cur.paidAmount || 0;
      cleanUpdates.remainingAmount = Math.max(0, numAmt - paid);
      if (cleanUpdates.remainingAmount === 0 && paid > 0) {
        cleanUpdates.status = 'Paid';
      }
    }

    if (updates.dueDate) {
      const [yearStr, monthStr] = updates.dueDate.split('-');
      cleanUpdates.billingMonthKey = `${yearStr}-${monthStr}`;
    }

    Object.keys(cleanUpdates).forEach((k) => cleanUpdates[k] === undefined && delete cleanUpdates[k]);

    await updateDoc(docRef, cleanUpdates);

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `updated bill for "${updates.providerName || cur.providerName}"`,
      entityType: 'expense',
      entityId: billId,
    });
  }

  /**
   * Cancels a bill without deleting historical records (Section 38).
   */
  async cancelBill(
    familyId: string,
    billId: string,
    providerName: string,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'bills', billId);
    const now = new Date().toISOString();

    await updateDoc(docRef, {
      status: 'Cancelled',
      cancelledAt: now,
      cancelledBy: currentUser.id,
      updatedAt: now,
    });

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `cancelled bill for "${providerName}"`,
      entityType: 'expense',
      entityId: billId,
    });
  }
}

export const billService = new BillService();
