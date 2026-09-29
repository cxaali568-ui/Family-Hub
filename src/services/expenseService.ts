import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
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
import { Expense, ExpenseFilter, User } from '../types';
import { familyService } from './familyService';

class ExpenseService {
  private inFlightSubmissions = new Set<string>();

  /**
   * Subscribes to real-time expenses for a family for a designated month (e.g. "2026-09").
   * Automatically filters out deleted records and sorts newest first.
   */
  subscribeMonthExpenses(
    familyId: string,
    monthKey: string,
    callback: (expenses: Expense[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!familyId || !monthKey) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'expenses');
    const q = query(
      colRef,
      where('monthKey', '==', monthKey),
      where('deletedAt', '==', null)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: Expense[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as Expense);
        });
        // Sort newest expenseDate first, then createdAt
        list.sort((a, b) => {
          const dateDiff = b.expenseDate.localeCompare(a.expenseDate);
          if (dateDiff !== 0) return dateDiff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        callback(list);
      },
      (err) => {
        console.warn('Error subscribing to month expenses:', err);
        // Fallback query if compound index on deletedAt is pending
        const fallbackQuery = query(colRef, where('monthKey', '==', monthKey));
        return onSnapshot(
          fallbackQuery,
          (snap) => {
            const list: Expense[] = [];
            snap.forEach((d) => {
              const item = d.data() as Expense;
              if (!item.deletedAt) list.push(item);
            });
            list.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
            callback(list);
          },
          (fErr) => {
            if (onError) onError(fErr);
          }
        );
      }
    );
  }

  /**
   * Adds a new household expense with duplicate submission protection and minor-unit financial precision.
   */
  async addExpense(
    familyId: string,
    data: {
      amount: number;
      currency?: string;
      categoryId: string;
      categoryName: string;
      categoryIcon?: string;
      expenseDate: string; // YYYY-MM-DD
      expenseTime?: string;
      description?: string;
      paidByMemberId?: string;
      paidByName?: string;
      forMemberId?: string;
      forPersonName?: string;
      paymentMethod?: Expense['paymentMethod'];
      receiptFile?: File;
      notes?: string;
      clientRequestId?: string;
    },
    currentUser: User
  ): Promise<Expense> {
    if (!familyId) throw new Error('Family ID is required');

    // Section 7: Amount validation
    const numAmount = Number(data.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Expense amount must be a positive number greater than 0.');
    }

    if (!data.categoryId || !data.categoryName) {
      throw new Error('Please select an expense category.');
    }

    if (!data.expenseDate) {
      throw new Error('Please provide the date of the expense.');
    }

    // Section 39: Duplicate protection
    const reqId = data.clientRequestId || `${currentUser.id}_${data.expenseDate}_${numAmount}_${Date.now()}`;
    if (this.inFlightSubmissions.has(reqId)) {
      throw new Error('A duplicate request was detected. Please wait a moment.');
    }
    this.inFlightSubmissions.add(reqId);

    try {
      const colRef = collection(db, 'families', familyId, 'expenses');
      const newDoc = doc(colRef);
      const expenseId = newDoc.id;

      // Extract reliable monthKey (YYYY-MM), year, and month
      const [yearStr, monthStr] = data.expenseDate.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const monthKey = `${yearStr}-${monthStr}`;

      // Upload receipt if provided
      let receiptPath: string | undefined;
      let receiptUrl: string | undefined;
      let receiptFileName: string | undefined;

      if (data.receiptFile) {
        receiptFileName = data.receiptFile.name;
        const uploadResult = await this.uploadReceipt(familyId, expenseId, data.receiptFile);
        receiptPath = uploadResult.storagePath;
        receiptUrl = uploadResult.downloadUrl;
      }

      const now = new Date().toISOString();
      const amountMinor = Math.round(numAmount * 100);

      const expense: Expense = {
        id: expenseId,
        familyId,
        amount: numAmount,
        amountMinor,
        currency: data.currency || 'PKR',
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        categoryIcon: data.categoryIcon,
        expenseDate: data.expenseDate,
        expenseTime: data.expenseTime || undefined,
        monthKey,
        year,
        month,
        description: data.description?.trim() || `${data.categoryName} expense`,
        paidByMemberId: data.paidByMemberId || undefined,
        paidByName: data.paidByName?.trim() || currentUser.name || 'Not specified',
        forMemberId: data.forMemberId || undefined,
        forPersonName: data.forPersonName?.trim() || 'Family',
        paymentMethod: data.paymentMethod || 'Cash',
        receiptPath,
        receiptUrl,
        receiptFileName,
        notes: data.notes?.trim() || undefined,
        clientRequestId: reqId,
        createdBy: currentUser.id,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedBy: null,
      };

      // Clean undefined keys for Firestore
      const cleanData: any = { ...expense };
      Object.keys(cleanData).forEach((k) => {
        if (cleanData[k] === undefined) delete cleanData[k];
      });

      await setDoc(newDoc, cleanData);

      // Section 45: Activity Log
      await familyService.logActivity({
        familyId,
        actorUserId: currentUser.id,
        actorName: currentUser.name,
        action: `added expense of ${expense.currency} ${expense.amount.toLocaleString()} for ${expense.categoryName} (${expense.description})`,
        entityType: 'expense',
        entityId: expense.id,
      });

      return expense;
    } finally {
      setTimeout(() => this.inFlightSubmissions.delete(reqId), 4000);
    }
  }

  /**
   * Updates an existing expense.
   */
  async updateExpense(
    familyId: string,
    expenseId: string,
    updates: Partial<Expense> & { receiptFile?: File },
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'expenses', expenseId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Expense record not found.');
    }

    const existing = snap.data() as Expense;

    // Handle receipt file update if a new file is attached
    let newReceiptPath = existing.receiptPath;
    let newReceiptUrl = existing.receiptUrl;
    let newReceiptFileName = existing.receiptFileName;

    if (updates.receiptFile) {
      newReceiptFileName = updates.receiptFile.name;
      const uploadRes = await this.uploadReceipt(familyId, expenseId, updates.receiptFile);
      newReceiptPath = uploadRes.storagePath;
      newReceiptUrl = uploadRes.downloadUrl;
    }

    const now = new Date().toISOString();
    const cleanUpdates: any = {
      ...updates,
      updatedAt: now,
    };
    delete cleanUpdates.receiptFile;

    // Recalculate minor amount if amount changed
    if (updates.amount !== undefined) {
      const numAmount = Number(updates.amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Expense amount must be positive.');
      }
      cleanUpdates.amount = numAmount;
      cleanUpdates.amountMinor = Math.round(numAmount * 100);
    }

    // Recalculate monthKey if date changed
    if (updates.expenseDate) {
      const [yearStr, monthStr] = updates.expenseDate.split('-');
      cleanUpdates.year = parseInt(yearStr, 10);
      cleanUpdates.month = parseInt(monthStr, 10);
      cleanUpdates.monthKey = `${yearStr}-${monthStr}`;
    }

    if (newReceiptPath) cleanUpdates.receiptPath = newReceiptPath;
    if (newReceiptUrl) cleanUpdates.receiptUrl = newReceiptUrl;
    if (newReceiptFileName) cleanUpdates.receiptFileName = newReceiptFileName;

    Object.keys(cleanUpdates).forEach((k) => {
      if (cleanUpdates[k] === undefined) delete cleanUpdates[k];
    });

    await updateDoc(docRef, cleanUpdates);

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `updated expense "${cleanUpdates.description || existing.description}" (${existing.currency} ${(cleanUpdates.amount || existing.amount).toLocaleString()})`,
      entityType: 'expense',
      entityId: expenseId,
    });
  }

  /**
   * Soft deletes an expense record as specified in Section 38.
   */
  async deleteExpense(
    familyId: string,
    expenseId: string,
    expenseDescription: string,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'expenses', expenseId);
    const now = new Date().toISOString();

    await updateDoc(docRef, {
      deletedAt: now,
      deletedBy: currentUser.id,
      updatedAt: now,
    });

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `deleted expense "${expenseDescription}"`,
      entityType: 'expense',
      entityId: expenseId,
    });
  }

  /**
   * Uploads receipt to Firebase Storage: families/{familyId}/expenses/{expenseId}/receipt/
   * Limit: 10MB.
   */
  async uploadReceipt(
    familyId: string,
    expenseId: string,
    file: File
  ): Promise<{ downloadUrl: string; storagePath: string }> {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Receipt file is too large. Maximum size is 10 MB.');
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `families/${familyId}/expenses/${expenseId}/receipt/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        null,
        async (error) => {
          console.warn('Storage upload error for receipt, using fallback:', error);
          if (file.size <= 2 * 1024 * 1024) {
            try {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({ downloadUrl: reader.result as string, storagePath: 'base64_embedded' });
              reader.onerror = () => reject(error);
              reader.readAsDataURL(file);
              return;
            } catch {}
          }
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ downloadUrl, storagePath });
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }

  /**
   * Deletes a receipt attachment from storage.
   */
  async deleteReceipt(familyId: string, expenseId: string, receiptPath?: string): Promise<void> {
    if (receiptPath && receiptPath !== 'base64_embedded') {
      try {
        const fileRef = ref(storage, receiptPath);
        await deleteObject(fileRef);
      } catch (err) {
        console.warn('Could not delete receipt file from storage:', err);
      }
    }

    const docRef = doc(db, 'families', familyId, 'expenses', expenseId);
    await updateDoc(docRef, {
      receiptPath: null,
      receiptUrl: null,
      receiptFileName: null,
      updatedAt: new Date().toISOString(),
    });
  }
}

export const expenseService = new ExpenseService();
