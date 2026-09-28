import React, { useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { DollarSign, Plus, CheckCircle, Clock, ShoppingBag, Zap, BookOpen, HeartPulse, Home, Utensils } from 'lucide-react';
import { FamilyExpense } from '../../types';

export const FamilyMoneyView: React.FC = () => {
  const { expenses, bills, addExpense, toggleBillPaid } = useFamily();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'expenses' | 'bills'>('expenses');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<FamilyExpense['category']>('Groceries');

  const totalHouseholdSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingBillsTotal = bills.filter(b => !b.isPaid).reduce((acc, curr) => acc + curr.amount, 0);

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!title.trim() || isNaN(val) || val <= 0 || !user) return;

    addExpense({
      title: title.trim(),
      amount: val,
      category,
      date: new Date().toISOString().split('T')[0],
      paidByUserId: user.id,
      paidByName: user.name,
    });

    setTitle('');
    setAmount('');
    setIsAddExpenseOpen(false);
  };

  const getCategoryIcon = (cat: FamilyExpense['category']) => {
    switch (cat) {
      case 'Groceries': return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
      case 'Utilities': return <Zap className="w-4 h-4 text-amber-500" />;
      case 'Education': return <BookOpen className="w-4 h-4 text-sky-500" />;
      case 'Healthcare': return <HeartPulse className="w-4 h-4 text-rose-500" />;
      case 'Home': return <Home className="w-4 h-4 text-indigo-500" />;
      case 'Dining': return <Utensils className="w-4 h-4 text-orange-500" />;
      default: return <DollarSign className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Family Money & Bills
          </h1>
          <p className="text-xs text-slate-500">
            Shared household budget, grocery logs, and recurring utility bills.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsAddExpenseOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Household Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
            ${totalHouseholdSpent.toFixed(0)}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Family Expenses</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              ${totalHouseholdSpent.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-400">{expenses.length} shared records</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg">
            ${pendingBillsTotal.toFixed(0)}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Upcoming Bills Due</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              ${pendingBillsTotal.toFixed(2)}
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              {bills.filter(b => !b.isPaid).length} unpaid bills
            </p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
            activeTab === 'expenses'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Shared Expenses ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('bills')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
            activeTab === 'bills'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Household Bills ({bills.length})
        </button>
      </div>

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="space-y-3">
          {expenses.map(exp => (
            <Card key={exp.id} className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  {getCategoryIcon(exp.category)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{exp.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{exp.category}</span>
                    <span>•</span>
                    <span>Paid by <strong>{exp.paidByName}</strong></span>
                    <span>•</span>
                    <span>{exp.date}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  ${exp.amount.toFixed(2)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Bills Tab */}
      {activeTab === 'bills' && (
        <div className="space-y-3">
          {bills.map(bill => (
            <Card key={bill.id} className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleBillPaid(bill.id)}
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                    bill.isPaid
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500'
                  }`}
                >
                  {bill.isPaid && <CheckCircle className="w-4 h-4" />}
                </button>
                <div>
                  <h4 className={`text-sm font-bold ${bill.isPaid ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                    {bill.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Due {bill.dueDate}
                    </span>
                    {bill.recurringMonthly && <span>• Recurring Monthly</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  ${bill.amount.toFixed(2)}
                </span>
                <Badge variant={bill.isPaid ? 'success' : 'warning'}>
                  {bill.isPaid ? 'Paid' : 'Unpaid'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        title="Add Shared Family Expense"
        subtitle="This expense will be visible to all family members."
      >
        <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
          <Input
            label="Expense Description"
            placeholder="e.g. Costco Grocery & Fruits"
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
              <option value="Groceries">Groceries</option>
              <option value="Utilities">Utilities</option>
              <option value="Education">Education</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Home">Home Maintenance</option>
              <option value="Dining">Dining Out</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddExpenseOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Post Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
