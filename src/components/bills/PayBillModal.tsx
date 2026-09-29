import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Bill, BillPayment, FamilyMemberProfile, User } from '../../types';
import { billPaymentService } from '../../services/billPaymentService';
import {
  DollarSign,
  Calendar,
  User as UserIcon,
  CreditCard,
  FileText,
  Upload,
  X,
  Paperclip,
  AlertCircle,
  CheckSquare,
  Square,
} from 'lucide-react';

interface PayBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  bill: Bill | null;
  currentUser: User;
  memberProfiles: FamilyMemberProfile[];
  onPaymentRecorded: (payment: BillPayment, updatedBill: Bill) => void;
}

export const PayBillModal: React.FC<PayBillModalProps> = ({
  isOpen,
  onClose,
  familyId,
  bill,
  currentUser,
  memberProfiles,
  onPaymentRecorded,
}) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paidByName, setPaidByName] = useState('');
  const [paidByMemberId, setPaidByMemberId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<BillPayment['paymentMethod']>('Online');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [linkToExpense, setLinkToExpense] = useState(true); // Section 46

  // Receipt File
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (bill) {
      setPaymentAmount(String(bill.remainingAmount));
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaidByName(currentUser.name || 'Ahmed');
      setPaidByMemberId('');
      setPaymentMethod('Online');
      setReferenceNumber('');
      setNotes('');
      setLinkToExpense(true);
      setReceiptFile(null);
    }
    setError('');
  }, [bill, isOpen, currentUser]);

  if (!bill) return null;

  const handlePaidByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const mem = memberProfiles.find((m) => m.fullName === val || m.id === val);
    if (mem) {
      setPaidByName(mem.fullName);
      setPaidByMemberId(mem.id);
    } else {
      setPaidByName(val);
      setPaidByMemberId('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setError('Supported receipts: JPG, PNG, WEBP, or PDF.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Receipt file size exceeds 10 MB limit.');
      return;
    }

    setError('');
    setReceiptFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(paymentAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid payment amount greater than 0.');
      return;
    }

    // Section 58 & 59: Overpayment check
    if (numAmount > bill.remainingAmount + 0.001) {
      setError('Payment amount cannot be greater than the remaining balance.');
      return;
    }

    setLoading(true);
    try {
      const result = await billPaymentService.recordPayment({
        familyId,
        bill,
        amount: numAmount,
        paymentDate,
        paidByMemberId: paidByMemberId || undefined,
        paidByName: paidByName || currentUser.name,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        receiptFile: receiptFile || undefined,
        linkToExpense,
        currentUser,
      });

      onPaymentRecorded(result.payment, result.updatedBill);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not record bill payment.');
    } finally {
      setLoading(false);
    }
  };

  const remainingAfterPayment = Math.max(0, bill.remainingAmount - (parseFloat(paymentAmount) || 0));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Bill Payment"
      subtitle={`Pay towards ${bill.providerName} (${bill.billTypeName}).`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Bill Summary Banner */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {bill.providerName}
            </h4>
            <p className="text-slate-400 mt-0.5">
              {bill.billTypeName} • Due {bill.dueDate}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Remaining Due</span>
            <span className="text-base font-black text-rose-600 dark:text-rose-400">
              {bill.currency} {bill.remainingAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Payment Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Payment Amount ({bill.currency}) *
            </label>
            <button
              type="button"
              onClick={() => setPaymentAmount(String(bill.remainingAmount))}
              className="text-[11px] font-bold text-indigo-600 hover:underline"
            >
              Pay Full ({bill.currency} {bill.remainingAmount.toLocaleString()})
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
              {bill.currency === 'PKR' ? 'Rs.' : bill.currency}
            </span>
            <input
              type="number"
              step="any"
              min="0.01"
              max={bill.remainingAmount}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              required
              autoFocus
              className="w-full pl-12 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Balance after this payment: {bill.currency} {remainingAfterPayment.toLocaleString()}
          </span>
        </div>

        {/* Payment Date & Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Payment Date *
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Online">Online Banking / App</option>
              <option value="Mobile Wallet">Mobile Wallet (Easypaisa/JazzCash)</option>
              <option value="Card">Debit / Credit Card</option>
              <option value="Bank">Bank Deposit</option>
              <option value="Cash">Cash at Counter</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Paid By & Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Paid By
            </label>
            <select
              value={paidByName}
              onChange={handlePaidByChange}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={currentUser.name || 'You'}>{currentUser.name || 'You'}</option>
              {memberProfiles
                .filter((m) => m.fullName !== currentUser.name)
                .map((m) => (
                  <option key={m.id} value={m.fullName}>
                    {m.fullName} ({m.relationship})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Transaction / Ref Number (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. TXN-940291"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Section 46: Link Payment to Family Expense */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-2.5">
          <input
            type="checkbox"
            id="linkExpenseCheck"
            checked={linkToExpense}
            onChange={(e) => setLinkToExpense(e.target.checked)}
            className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="linkExpenseCheck" className="text-xs text-slate-800 dark:text-slate-200 font-medium">
            <strong>Also record this payment as a Family Expense</strong>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Automatically creates a linked expense transaction under your family's monthly budget.
            </span>
          </label>
        </div>

        {/* Receipt Upload (Section 23) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Payment Receipt / Screenshot (Optional, Max 10MB)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              icon={<Upload className="w-3.5 h-3.5" />}
            >
              {receiptFile ? 'Change Receipt' : 'Upload Receipt'}
            </Button>

            {receiptFile && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium truncate max-w-xs">
                <Paperclip className="w-3 h-3 shrink-0" />
                <span className="truncate">{receiptFile.name}</span>
                <button type="button" onClick={() => setReceiptFile(null)} className="hover:text-rose-500">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Paid via mobile banking app..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="font-bold">
            Record Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
