import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Expense, ExpenseCategory, FamilyMemberProfile, User } from '../../types';
import { expenseService } from '../../services/expenseService';
import {
  DollarSign,
  Calendar,
  Clock,
  User as UserIcon,
  Tag,
  CreditCard,
  FileText,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Paperclip,
  Check,
  Utensils,
  ShoppingCart,
  GraduationCap,
  HeartPulse,
  Car,
  Fuel,
  Zap,
  Flame,
  Droplets,
  Wifi,
  Phone,
  Home,
  Sofa,
  Shirt,
  BookOpen,
  Baby,
  Pill,
  Film,
  Plane,
  Wrench,
  Gift,
  Package,
} from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  currentUser: User;
  categories: ExpenseCategory[];
  memberProfiles: FamilyMemberProfile[];
  editExpense?: Expense | null;
  defaultMonthKey?: string;
  onExpenseSaved: (expense: Expense, isEdit: boolean) => void;
  currency?: string;
}

export const getCategoryIconComponent = (iconName: string) => {
  switch (iconName?.toLowerCase()) {
    case 'utensils':
    case 'food':
      return <Utensils className="w-4 h-4" />;
    case 'shoppingcart':
    case 'shoppingbag':
    case 'groceries':
      return <ShoppingCart className="w-4 h-4" />;
    case 'graduationcap':
    case 'school':
      return <GraduationCap className="w-4 h-4" />;
    case 'heartpulse':
    case 'medical':
      return <HeartPulse className="w-4 h-4" />;
    case 'car':
    case 'transport':
      return <Car className="w-4 h-4" />;
    case 'fuel':
      return <Fuel className="w-4 h-4" />;
    case 'zap':
    case 'electricity':
      return <Zap className="w-4 h-4" />;
    case 'flame':
    case 'gas':
      return <Flame className="w-4 h-4" />;
    case 'droplets':
    case 'water':
      return <Droplets className="w-4 h-4" />;
    case 'wifi':
    case 'internet':
      return <Wifi className="w-4 h-4" />;
    case 'phone':
      return <Phone className="w-4 h-4" />;
    case 'home':
    case 'rent':
      return <Home className="w-4 h-4" />;
    case 'sofa':
    case 'household':
      return <Sofa className="w-4 h-4" />;
    case 'shirt':
    case 'clothing':
      return <Shirt className="w-4 h-4" />;
    case 'bookopen':
    case 'education':
      return <BookOpen className="w-4 h-4" />;
    case 'baby':
    case 'children':
      return <Baby className="w-4 h-4" />;
    case 'pill':
    case 'medicine':
      return <Pill className="w-4 h-4" />;
    case 'film':
    case 'entertainment':
      return <Film className="w-4 h-4" />;
    case 'plane':
    case 'travel':
      return <Plane className="w-4 h-4" />;
    case 'wrench':
    case 'repairs':
      return <Wrench className="w-4 h-4" />;
    case 'gift':
    case 'gifts':
      return <Gift className="w-4 h-4" />;
    default:
      return <Package className="w-4 h-4" />;
  }
};

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  familyId,
  currentUser,
  categories,
  memberProfiles,
  editExpense,
  defaultMonthKey,
  onExpenseSaved,
  currency = 'PKR',
}) => {
  const isEditing = Boolean(editExpense);

  // Quick Fields (Top Priority)
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [expenseDate, setExpenseDate] = useState('');

  // Optional / More Details Fields
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [description, setDescription] = useState('');
  const [paidByName, setPaidByName] = useState('');
  const [paidByMemberId, setPaidByMemberId] = useState('');
  const [forPersonName, setForPersonName] = useState('Family');
  const [forMemberId, setForMemberId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Expense['paymentMethod']>('Cash');
  const [expenseTime, setExpenseTime] = useState('');
  const [notes, setNotes] = useState('');

  // Receipt
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize or reset form
  useEffect(() => {
    if (editExpense) {
      setAmount(String(editExpense.amount));
      setCategoryId(editExpense.categoryId || categories[0]?.id || '');
      setExpenseDate(editExpense.expenseDate);
      setDescription(editExpense.description || '');
      setPaidByName(editExpense.paidByName || currentUser.name);
      setPaidByMemberId(editExpense.paidByMemberId || '');
      setForPersonName(editExpense.forPersonName || 'Family');
      setForMemberId(editExpense.forMemberId || '');
      setPaymentMethod(editExpense.paymentMethod || 'Cash');
      setExpenseTime(editExpense.expenseTime || '');
      setNotes(editExpense.notes || '');
      setExistingReceiptUrl(editExpense.receiptUrl);
      setReceiptFile(null);
      setShowMoreDetails(true);
    } else {
      const today = new Date().toISOString().split('T')[0];
      setAmount('');
      setCategoryId(categories[0]?.id || '');
      setExpenseDate(today);
      setDescription('');
      setPaidByName(currentUser.name || 'Ahmed');
      setPaidByMemberId('');
      setForPersonName('Family');
      setForMemberId('');
      setPaymentMethod('Cash');
      setExpenseTime('');
      setNotes('');
      setExistingReceiptUrl(undefined);
      setReceiptFile(null);
      setShowMoreDetails(false);
    }
    setError('');
  }, [editExpense, isOpen, categories, currentUser]);

  const handlePaidByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'Not specified') {
      setPaidByName('Not specified');
      setPaidByMemberId('');
    } else {
      const member = memberProfiles.find((m) => m.fullName === val || m.id === val);
      if (member) {
        setPaidByName(member.fullName);
        setPaidByMemberId(member.id);
      } else {
        setPaidByName(val);
        setPaidByMemberId('');
      }
    }
  };

  const handleForPersonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'Family') {
      setForPersonName('Family');
      setForMemberId('');
    } else {
      const member = memberProfiles.find((m) => m.fullName === val || m.id === val);
      if (member) {
        setForPersonName(member.fullName);
        setForMemberId(member.id);
      } else {
        setForPersonName(val);
        setForMemberId('');
      }
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
      setError('File is too large. Maximum size is 10 MB.');
      return;
    }

    setError('');
    setReceiptFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid expense amount greater than 0.');
      return;
    }

    const selectedCategory = categories.find((c) => c.id === categoryId) || categories[0];
    if (!selectedCategory) {
      setError('Please select an expense category.');
      return;
    }

    if (!expenseDate) {
      setError('Please select an expense date.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && editExpense) {
        await expenseService.updateExpense(
          familyId,
          editExpense.id,
          {
            amount: numAmount,
            categoryId: selectedCategory.id,
            categoryName: selectedCategory.name,
            categoryIcon: selectedCategory.icon,
            expenseDate,
            expenseTime: expenseTime || undefined,
            description: description.trim() || `${selectedCategory.name} expense`,
            paidByName: paidByName.trim() || 'Not specified',
            paidByMemberId: paidByMemberId || undefined,
            forPersonName: forPersonName.trim() || 'Family',
            forMemberId: forMemberId || undefined,
            paymentMethod,
            receiptFile: receiptFile || undefined,
            notes: notes.trim() || undefined,
          },
          currentUser
        );

        onExpenseSaved(
          {
            ...editExpense,
            amount: numAmount,
            categoryId: selectedCategory.id,
            categoryName: selectedCategory.name,
            categoryIcon: selectedCategory.icon,
            expenseDate,
            expenseTime: expenseTime || undefined,
            description: description.trim() || `${selectedCategory.name} expense`,
            paidByName: paidByName.trim() || 'Not specified',
            forPersonName: forPersonName.trim() || 'Family',
            paymentMethod,
            notes: notes.trim() || undefined,
            updatedAt: new Date().toISOString(),
          },
          true
        );
      } else {
        const newExpense = await expenseService.addExpense(
          familyId,
          {
            amount: numAmount,
            currency,
            categoryId: selectedCategory.id,
            categoryName: selectedCategory.name,
            categoryIcon: selectedCategory.icon,
            expenseDate,
            expenseTime: expenseTime || undefined,
            description: description.trim() || `${selectedCategory.name} expense`,
            paidByName: paidByName.trim() || currentUser.name || 'Not specified',
            paidByMemberId: paidByMemberId || undefined,
            forPersonName: forPersonName.trim() || 'Family',
            forMemberId: forMemberId || undefined,
            paymentMethod,
            receiptFile: receiptFile || undefined,
            notes: notes.trim() || undefined,
          },
          currentUser
        );

        onExpenseSaved(newExpense, false);
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving expense:', err);
      setError(err?.message || 'Failed to save expense. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Expense' : 'Add Family Expense'}
      subtitle={
        isEditing
          ? 'Update expense details and receipts.'
          : 'Quickly record a daily household expense in seconds.'
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

        {/* ----------------------------------------------------------------- */}
        {/* QUICK FLOW: Amount, Category, Date (Completed in < 10 seconds!)   */}
        {/* ----------------------------------------------------------------- */}
        <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-3.5">
          {/* Amount Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Amount ({currency}) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
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
                className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-lg font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Category & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* COLLAPSIBLE: More Details (Description, Payer, For Person, Notes) */}
        {/* ----------------------------------------------------------------- */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span>Additional Details & Receipts (Optional)</span>
            {showMoreDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showMoreDetails && (
            <div className="p-4 space-y-3 bg-white dark:bg-slate-900 text-xs">
              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item Description / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly grocery shopping, Fuel for car, Ali school books"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Paid By & For Person */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Paid By */}
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
                    <option value="Not specified">Not specified</option>
                  </select>
                </div>

                {/* For Person */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    For Person / Purpose
                  </label>
                  <select
                    value={forPersonName}
                    onChange={handleForPersonChange}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Family">Shared Family</option>
                    {memberProfiles.map((m) => (
                      <option key={m.id} value={m.fullName}>
                        {m.fullName} ({m.relationship})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Method & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Online">Online Payment</option>
                    <option value="Mobile Wallet">Mobile Wallet (Easypaisa/JazzCash)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={expenseTime}
                    onChange={(e) => setExpenseTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Receipt Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Receipt / Invoice (Optional, Max 10MB)
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
                    {receiptFile || existingReceiptUrl ? 'Replace Receipt' : 'Upload Receipt'}
                  </Button>

                  {receiptFile && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium truncate max-w-xs">
                      <Paperclip className="w-3 h-3 shrink-0" />
                      <span className="truncate">{receiptFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setReceiptFile(null)}
                        className="hover:text-rose-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {!receiptFile && existingReceiptUrl && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Receipt Attached
                    </span>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Bought groceries for visiting guests..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="font-bold">
            {isEditing ? 'Save Changes' : 'Save Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
