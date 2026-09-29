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
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Bill, BillPayment, BillTemplate, User } from '../types';
import { familyService } from './familyService';
import { expenseService } from './expenseService';
import { computeNextDueDate } from './billTemplateService';

class BillPaymentService {
  /**
   * Subscribes to real-time payments for a bill.
   */
  subscribePayments(
    familyId: string,
    billId: string,
    callback: (payments: BillPayment[]) => void
  ): () => void {
    if (!familyId || !billId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'bills', billId, 'payments');

    return onSnapshot(colRef, (snapshot) => {
      const list: BillPayment[] = [];
      snapshot.forEach((d) => list.push(d.data() as BillPayment));
      list.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
      callback(list);
    });
  }

  /**
   * Records a payment towards a bill with overpayment protection, status update,
   * optional link to Family Expense, and automatic next recurring due date scheduling.
   */
  async recordPayment(params: {
    familyId: string;
    bill: Bill;
    amount: number;
    paymentDate: string;
    paidByMemberId?: string;
    paidByName: string;
    paymentMethod: BillPayment['paymentMethod'];
    referenceNumber?: string;
    notes?: string;
    receiptFile?: File;
    linkToExpense?: boolean;
    currentUser: User;
  }): Promise<{ payment: BillPayment; updatedBill: Bill }> {
    const {
      familyId,
      bill,
      amount,
      paymentDate,
      paidByMemberId,
      paidByName,
      paymentMethod,
      referenceNumber,
      notes,
      receiptFile,
      linkToExpense,
      currentUser,
    } = params;

    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new Error('Payment amount must be greater than 0.');
    }

    // Section 58 & 59: Overpayment protection
    if (paymentAmount > bill.remainingAmount + 0.001) {
      throw new Error('Payment amount cannot be greater than the remaining balance.');
    }

    const billDocRef = doc(db, 'families', familyId, 'bills', bill.id);
    const paymentColRef = collection(db, 'families', familyId, 'bills', bill.id, 'payments');
    const newPaymentDoc = doc(paymentColRef);
    const paymentId = newPaymentDoc.id;

    // Upload receipt if provided
    let receiptPath: string | undefined;
    let receiptUrl: string | undefined;
    let receiptFileName: string | undefined;

    if (receiptFile) {
      receiptFileName = receiptFile.name;
      const res = await this.uploadReceipt(familyId, bill.id, receiptFile);
      receiptPath = res.storagePath;
      receiptUrl = res.downloadUrl;
    }

    // Optional: link to Family Expense (Section 46)
    let linkedExpenseId: string | undefined;
    if (linkToExpense) {
      try {
        const exp = await expenseService.addExpense(
          familyId,
          {
            amount: paymentAmount,
            currency: bill.currency,
            categoryId: `cat_${bill.billTypeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            categoryName: bill.billTypeName,
            categoryIcon: bill.billTypeIcon,
            expenseDate: paymentDate,
            description: `${bill.providerName} (${bill.billTypeName}) bill payment`,
            paidByName,
            paidByMemberId,
            paymentMethod,
            receiptFile: receiptFile || undefined,
            notes: `Paid towards ${bill.providerName} bill due on ${bill.dueDate}${referenceNumber ? ` (Ref: ${referenceNumber})` : ''}`,
          },
          currentUser
        );
        linkedExpenseId = exp.id;
      } catch (expErr) {
        console.warn('Could not auto-create linked expense:', expErr);
      }
    }

    const amountMinor = Math.round(paymentAmount * 100);
    const now = new Date().toISOString();

    const payment: BillPayment = {
      id: paymentId,
      billId: bill.id,
      familyId,
      amount: paymentAmount,
      amountMinor,
      paymentDate,
      paidByMemberId,
      paidByName: paidByName || currentUser.name,
      paymentMethod,
      referenceNumber: referenceNumber?.trim() || undefined,
      receiptPath,
      receiptUrl,
      receiptFileName,
      linkedExpenseId,
      notes: notes?.trim() || undefined,
      createdBy: currentUser.id,
      createdAt: now,
    };

    const cleanPayment: any = { ...payment };
    Object.keys(cleanPayment).forEach((k) => cleanPayment[k] === undefined && delete cleanPayment[k]);
    await setDoc(newPaymentDoc, cleanPayment);

    // Calculate updated bill balance and status
    const currentPaidMinor = Math.round((bill.paidAmount || 0) * 100);
    const billTotalMinor = bill.amountMinor || Math.round(bill.amount * 100);
    const newPaidMinor = currentPaidMinor + amountMinor;
    const newRemainingMinor = Math.max(0, billTotalMinor - newPaidMinor);

    const newPaidAmount = newPaidMinor / 100;
    const newRemainingAmount = newRemainingMinor / 100;
    const newStatus = newRemainingAmount === 0 ? 'Paid' : 'Partially Paid';

    const billUpdates: Partial<Bill> = {
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      status: newStatus,
      latestPaymentDate: paymentDate,
      latestPaidBy: paidByName || currentUser.name,
      receiptUrl: receiptUrl || bill.receiptUrl,
      updatedAt: now,
    };

    await updateDoc(billDocRef, billUpdates);

    const updatedBill: Bill = {
      ...bill,
      ...billUpdates,
    };

    // Activity log
    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `recorded payment of ${bill.currency} ${paymentAmount.toLocaleString()} for "${bill.providerName}" (${newStatus})`,
      entityType: 'expense',
      entityId: bill.id,
    });

    // Section 15: If bill was recurring and is now fully paid, schedule next recurrence!
    if (newStatus === 'Paid' && bill.templateId) {
      await this.handleNextRecurringSchedule(familyId, bill, currentUser);
    }

    return { payment, updatedBill };
  }

  /**
   * When a recurring bill is fully paid, advances template nextDueDate
   * and creates the next scheduled bill instance (Section 15, 17, 72).
   */
  private async handleNextRecurringSchedule(
    familyId: string,
    paidBill: Bill,
    currentUser: User
  ): Promise<void> {
    if (!paidBill.templateId) return;

    try {
      const templateDocRef = doc(db, 'families', familyId, 'billTemplates', paidBill.templateId);
      const snap = await getDoc(templateDocRef);
      if (!snap.exists()) return;

      const template = snap.data() as BillTemplate;
      if (!template.active) return; // Paused templates do not generate next instances

      const nextDue = computeNextDueDate(paidBill.dueDate, template.frequency, template.customIntervalDays);
      const [nYear, nMonth] = nextDue.split('-');
      const nextMonthKey = `${nYear}-${nMonth}`;

      // Check if instance already exists for nextDue
      const billsCol = collection(db, 'families', familyId, 'bills');
      const q = query(
        billsCol,
        where('templateId', '==', template.id),
        where('dueDate', '==', nextDue)
      );
      const existingSnap = await getDocs(q);
      if (!existingSnap.empty) {
        // Already created, just update template nextDueDate
        await updateDoc(templateDocRef, { nextDueDate: nextDue, updatedAt: new Date().toISOString() });
        return;
      }

      // Create next instance
      const newBillDoc = doc(billsCol);
      const now = new Date().toISOString();
      const nextAmount = template.amountType === 'fixed' ? template.defaultAmount : 0;
      const nextAmountMinor = Math.round(nextAmount * 100);

      const nextBill: Bill = {
        id: newBillDoc.id,
        familyId,
        templateId: template.id,
        billTypeId: template.billTypeId,
        billTypeName: template.billTypeName,
        billTypeIcon: template.billTypeIcon,
        providerName: template.providerName,
        amount: nextAmount,
        amountMinor: nextAmountMinor,
        paidAmount: 0,
        remainingAmount: nextAmount,
        currency: paidBill.currency || 'PKR',
        dueDate: nextDue,
        billingMonthKey: nextMonthKey,
        status: 'Pending',
        accountNumberMasked: template.accountNumberMasked,
        accountNumberFull: template.accountNumberFull,
        referenceNumber: template.referenceNumber,
        notes: template.notes,
        isRecurringInstance: true,
        frequency: template.frequency,
        createdBy: currentUser.id,
        createdAt: now,
        updatedAt: now,
        cancelledAt: null,
        cancelledBy: null,
      };

      const clean: any = { ...nextBill };
      Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);

      await setDoc(newBillDoc, clean);

      // Update template anchor
      await updateDoc(templateDocRef, {
        nextDueDate: nextDue,
        updatedAt: now,
      });
    } catch (err) {
      console.warn('Could not auto-generate next recurring bill instance:', err);
    }
  }

  /**
   * Uploads receipt for a bill to Firebase Storage: families/{familyId}/bills/{billId}/receipts/
   */
  async uploadReceipt(
    familyId: string,
    billId: string,
    file: File
  ): Promise<{ downloadUrl: string; storagePath: string }> {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Receipt file is too large. Maximum size is 10 MB.');
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `families/${familyId}/bills/${billId}/receipts/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        null,
        async (error) => {
          console.warn('Storage upload error for bill receipt, using fallback:', error);
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
}

export const billPaymentService = new BillPaymentService();
