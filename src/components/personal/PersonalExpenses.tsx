import React, { useState } from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { DollarSign, Plus, Trash2, Tag, Calendar } from 'lucide-react';
import { PersonalExpense } from '../../types';

export const PersonalExpenses: React.FC = () => {
  const { expenses, addExpense, deleteExpense } = usePersonal();
  const { t } = useLanguage();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<PersonalExpense['category']>('Personal');

  const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!title.trim() || isNaN(num) || num <= 0) return;

    addExpense({
      title: title.trim(),
      amount: num,
      category,
      date: new Date().toISOString().split('T')[0],
    });

    setTitle('');
    setAmount('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            {t.personal.expenses}
          </h2>
          <p className="text-xs text-slate-500">
            Total Private Spending: <span className="font-bold text-slate-900 dark:text-slate-100">${total.toFixed(2)}</span>
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Expense
        </Button>
      </div>

      {/* Expense List */}
      {expenses.length === 0 ? (
        <EmptyState
          icon={<DollarSign className="w-7 h-7" />}
          title="No private expenses recorded"
          description="Track your personal discretionary purchases, surprise gifts, or subscriptions securely."
          actionLabel="Add Personal Expense"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="space-y-2.5">
          {expenses.map(item => (
            <Card key={item.id} className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                  ${item.amount.toFixed(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {item.category}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {item.date}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  ${item.amount.toFixed(2)}
                </span>
                <button
                  onClick={() => deleteExpense(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Private Expense"
        subtitle="This expense will not appear in the Family Money section."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Expense Description"
            placeholder="e.g. Surprise Anniversary Gift"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Amount ($)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Personal">Personal</option>
              <option value="Work">Work</option>
              <option value="Tech">Tech</option>
              <option value="Subscription">Subscription</option>
              <option value="Dining">Dining</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Private Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
