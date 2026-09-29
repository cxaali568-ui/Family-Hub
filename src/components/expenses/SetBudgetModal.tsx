import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FamilyBudget, User } from '../../types';
import { budgetService } from '../../services/budgetService';
import { DollarSign, AlertCircle, Check } from 'lucide-react';

interface SetBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  year: number;
  month: number;
  monthLabel: string;
  currentBudget: FamilyBudget | null;
  totalSpent: number;
  currentUser: User;
  onBudgetSaved: (budget: FamilyBudget) => void;
  currency?: string;
}

export const SetBudgetModal: React.FC<SetBudgetModalProps> = ({
  isOpen,
  onClose,
  familyId,
  year,
  month,
  monthLabel,
  currentBudget,
  totalSpent,
  currentUser,
  onBudgetSaved,
  currency = 'PKR',
}) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentBudget) {
      setAmount(String(currentBudget.amount));
    } else {
      setAmount('');
    }
    setError('');
  }, [currentBudget, isOpen]);

  const numAmount = parseFloat(amount) || 0;
  const remainingPreview = numAmount > 0 ? numAmount - totalSpent : 0;
  const usagePercentagePreview = numAmount > 0 ? Math.round((totalSpent / numAmount) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid monthly budget amount greater than 0.');
      return;
    }

    setLoading(true);
    try {
      const saved = await budgetService.setBudget(
        familyId,
        year,
        month,
        val,
        currentUser,
        currency
      );
      onBudgetSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not save monthly budget.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Monthly Expense Budget"
      subtitle={`Set target spending limit for ${monthLabel}.`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Budget Amount ({currency}) *
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
              {currency === 'PKR' ? 'Rs.' : currency}
            </span>
            <input
              type="number"
              step="any"
              min="1"
              placeholder="e.g. 180000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
              className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Live Preview */}
        {numAmount > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span>Already Spent in {monthLabel}:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {currency === 'PKR' ? 'Rs.' : currency} {totalSpent.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between font-bold">
              <span>Remaining Budget:</span>
              <span
                className={
                  remainingPreview >= 0
                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'text-rose-600 dark:text-rose-400 font-extrabold'
                }
              >
                {currency === 'PKR' ? 'Rs.' : currency} {remainingPreview.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span>Projected Usage:</span>
              <span>{usagePercentagePreview}%</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="font-bold">
            Save Budget
          </Button>
        </div>
      </form>
    </Modal>
  );
};
