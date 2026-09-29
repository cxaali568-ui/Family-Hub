import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Bill, BillType, BillTemplate, User } from '../../types';
import { billService } from '../../services/billService';
import {
  Zap,
  Flame,
  Droplets,
  Wifi,
  Phone,
  Home,
  GraduationCap,
  Shield,
  Film,
  Package,
  Calendar,
  DollarSign,
  AlertCircle,
  Repeat,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AddBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  currentUser: User;
  billTypes: BillType[];
  editBill?: Bill | null;
  onBillSaved: (bill: Bill, isEdit: boolean) => void;
  currency?: string;
}

export const getBillTypeIcon = (iconName: string) => {
  switch (iconName?.toLowerCase()) {
    case 'zap':
    case 'electricity':
      return <Zap className="w-4 h-4 text-amber-500" />;
    case 'flame':
    case 'gas':
      return <Flame className="w-4 h-4 text-red-500" />;
    case 'droplets':
    case 'water':
      return <Droplets className="w-4 h-4 text-cyan-500" />;
    case 'wifi':
    case 'internet':
      return <Wifi className="w-4 h-4 text-sky-500" />;
    case 'phone':
    case 'mobile':
      return <Phone className="w-4 h-4 text-teal-500" />;
    case 'home':
    case 'rent':
      return <Home className="w-4 h-4 text-purple-500" />;
    case 'graduationcap':
    case 'school':
      return <GraduationCap className="w-4 h-4 text-blue-500" />;
    case 'shield':
    case 'insurance':
      return <Shield className="w-4 h-4 text-emerald-500" />;
    case 'film':
    case 'subscription':
      return <Film className="w-4 h-4 text-pink-500" />;
    default:
      return <Package className="w-4 h-4 text-slate-500" />;
  }
};

export const AddBillModal: React.FC<AddBillModalProps> = ({
  isOpen,
  onClose,
  familyId,
  currentUser,
  billTypes,
  editBill,
  onBillSaved,
  currency = 'PKR',
}) => {
  const isEditing = Boolean(editBill);

  // Quick Fields
  const [billTypeId, setBillTypeId] = useState('');
  const [providerName, setProviderName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  // More Details
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<BillTemplate['frequency']>('monthly');
  const [amountType, setAmountType] = useState<'fixed' | 'variable'>('fixed');
  const [accountNumber, setAccountNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editBill) {
      setBillTypeId(editBill.billTypeId);
      setProviderName(editBill.providerName || '');
      setAmount(String(editBill.amount));
      setDueDate(editBill.dueDate);
      setIsRecurring(editBill.isRecurringInstance);
      setRecurringFrequency((editBill.frequency as any) || 'monthly');
      setAccountNumber(editBill.accountNumberFull || editBill.accountNumberMasked || '');
      setReferenceNumber(editBill.referenceNumber || '');
      setNotes(editBill.notes || '');
      setShowMoreDetails(true);
    } else {
      setBillTypeId(billTypes[0]?.id || '');
      setProviderName('');
      setAmount('');
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 7);
      setDueDate(defaultDue.toISOString().split('T')[0]);
      setIsRecurring(false);
      setRecurringFrequency('monthly');
      setAmountType('fixed');
      setAccountNumber('');
      setReferenceNumber('');
      setNotes('');
      setShowMoreDetails(false);
    }
    setError('');
  }, [editBill, isOpen, billTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid bill amount greater than 0.');
      return;
    }

    if (!providerName.trim()) {
      setError('Please enter the bill provider or company name.');
      return;
    }

    if (!dueDate) {
      setError('Please select a due date.');
      return;
    }

    const selectedType = billTypes.find((t) => t.id === billTypeId) || billTypes[0];
    if (!selectedType) {
      setError('Please select a bill type.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && editBill) {
        await billService.updateBill(
          familyId,
          editBill.id,
          {
            billTypeId: selectedType.id,
            billTypeName: selectedType.name,
            billTypeIcon: selectedType.icon,
            providerName: providerName.trim(),
            amount: numAmount,
            dueDate,
            accountNumberFull: accountNumber.trim() || undefined,
            referenceNumber: referenceNumber.trim() || undefined,
            notes: notes.trim() || undefined,
          },
          currentUser
        );

        onBillSaved(
          {
            ...editBill,
            billTypeId: selectedType.id,
            billTypeName: selectedType.name,
            billTypeIcon: selectedType.icon,
            providerName: providerName.trim(),
            amount: numAmount,
            dueDate,
            notes: notes.trim() || undefined,
            updatedAt: new Date().toISOString(),
          },
          true
        );
      } else {
        const newBill = await billService.addBill(
          familyId,
          {
            billTypeId: selectedType.id,
            billTypeName: selectedType.name,
            billTypeIcon: selectedType.icon,
            providerName: providerName.trim(),
            amount: numAmount,
            currency,
            dueDate,
            accountNumber: accountNumber.trim() || undefined,
            referenceNumber: referenceNumber.trim() || undefined,
            notes: notes.trim() || undefined,
            isRecurring,
            recurringFrequency: isRecurring ? recurringFrequency : undefined,
            amountType,
          },
          currentUser
        );

        onBillSaved(newBill, false);
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not save bill.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Bill' : 'Add Bill'}
      subtitle={
        isEditing
          ? 'Update bill details and due dates.'
          : 'Track utility, rent, internet, or subscription obligations.'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* QUICK FIELDS (Section 7, 54): Type, Provider, Amount, Due Date */}
        {/* ------------------------------------------------------------- */}
        <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-3.5">
          {/* Bill Type & Provider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Bill Type *
              </label>
              <select
                value={billTypeId}
                onChange={(e) => setBillTypeId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {billTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Provider / Company *
              </label>
              <input
                type="text"
                placeholder="e.g. LESCO, SNGPL, PTCL, Landlord"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Amount & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Amount ({currency}) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                  {currency === 'PKR' ? 'Rs.' : currency}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus={!isEditing}
                  className="w-full pl-12 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* COLLAPSIBLE: More Details (Recurring, Account No, Notes)       */}
        {/* ------------------------------------------------------------- */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span>Recurring Schedule & Account Numbers (Optional)</span>
            {showMoreDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showMoreDetails && (
            <div className="p-4 space-y-3 bg-white dark:bg-slate-900 text-xs">
              {/* Recurring Settings (Section 13, 14) */}
              {!isEditing && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Repeat className="w-3.5 h-3.5 text-indigo-500" />
                      Recurring Bill Schedule
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>

                  {isRecurring && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Billing Frequency
                        </label>
                        <select
                          value={recurringFrequency}
                          onChange={(e) => setRecurringFrequency(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="bimonthly">Every 2 Months</option>
                          <option value="quarterly">Quarterly (3 Months)</option>
                          <option value="semiannual">Every 6 Months</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Amount Type
                        </label>
                        <select
                          value={amountType}
                          onChange={(e) => setAmountType(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                        >
                          <option value="fixed">Fixed Amount (e.g. Internet, Rent)</option>
                          <option value="variable">Variable Amount (e.g. Electricity, Gas)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Account / Consumer / Reference Numbers (Section 9, 63) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Consumer / Account Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 04-1234567-890"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Masked in views as ****1234 for family privacy.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bill Reference / Tariff
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A-34091"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Pay before 10th to avoid late surcharge..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="font-bold">
            {isEditing ? 'Save Changes' : 'Save Bill'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
