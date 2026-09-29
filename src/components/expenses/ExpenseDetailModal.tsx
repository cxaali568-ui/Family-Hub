import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Expense, User } from '../../types';
import { getCategoryIconComponent } from './AddExpenseModal';
import {
  Calendar,
  Clock,
  User as UserIcon,
  CreditCard,
  FileText,
  Paperclip,
  Download,
  Edit2,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Users,
} from 'lucide-react';

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  currentUser: User;
  canManage: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => Promise<void>;
  currency?: string;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  isOpen,
  onClose,
  expense,
  currentUser,
  canManage,
  onEdit,
  onDelete,
  currency = 'PKR',
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (!expense) return null;

  const isOwnerOrCreator = expense.createdBy === currentUser.id || canManage;

  const handleDeleteSubmit = async () => {
    setDeleteLoading(true);
    try {
      await onDelete(expense);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Could not delete expense.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const isReceiptImage =
    expense.receiptUrl &&
    (expense.receiptUrl.includes('.jpg') ||
      expense.receiptUrl.includes('.jpeg') ||
      expense.receiptUrl.includes('.png') ||
      expense.receiptUrl.includes('.webp') ||
      expense.receiptUrl.startsWith('data:image'));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Expense Details"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Top Header Card */}
        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              {getCategoryIconComponent(expense.categoryIcon || expense.categoryName)}
            </div>
            <div>
              <Badge variant="primary">{expense.categoryName}</Badge>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                {expense.description}
              </h3>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Amount</span>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100">
              {currency === 'PKR' ? 'Rs.' : currency} {expense.amount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Detailed Metadata Grid */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Date & Time
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {new Date(expense.expenseDate).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              {expense.expenseTime && ` at ${expense.expenseTime}`}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5" /> Paid By
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {expense.paidByName}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> For Person
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {expense.forPersonName || 'Shared Family'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Payment Method
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {expense.paymentMethod}
            </span>
          </div>

          {expense.notes && (
            <div className="py-1">
              <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                <FileText className="w-3.5 h-3.5" /> Notes
              </span>
              <p className="font-medium text-slate-700 dark:text-slate-300 pl-5 whitespace-pre-wrap leading-relaxed">
                {expense.notes}
              </p>
            </div>
          )}
        </div>

        {/* Receipt Attachment Section */}
        {expense.receiptUrl && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                Attached Receipt
              </h5>
              <a
                href={expense.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={expense.receiptFileName || 'receipt'}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </div>

            {isReceiptImage ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-56 bg-black/5 flex items-center justify-center">
                <img
                  src={expense.receiptUrl}
                  alt="Expense receipt"
                  className="w-full h-full object-contain max-h-56"
                />
              </div>
            ) : (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="truncate">{expense.receiptFileName || 'Receipt Document (PDF)'}</span>
                <a
                  href={expense.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open
                </a>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Box */}
        {showDeleteConfirm && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 space-y-2.5 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-200">
                  Delete this expense?
                </h4>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                  This expense will be removed from your monthly reports and calculations.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteSubmit}
                loading={deleteLoading}
              >
                Yes, Delete Expense
              </Button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            {isOwnerOrCreator && !showDeleteConfirm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                icon={<Trash2 className="w-4 h-4" />}
              >
                Delete
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            {isOwnerOrCreator && (
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  onEdit(expense);
                }}
                icon={<Edit2 className="w-4 h-4" />}
                className="font-bold"
              >
                Edit Expense
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
