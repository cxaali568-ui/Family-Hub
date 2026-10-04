import React, { useState, useMemo } from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { PersonalExpense } from '../../types';
import { personalService } from '../../services/personalService';
import {
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Filter,
  Search,
  FileText,
  CreditCard,
  PieChart,
  Tag,
  ArrowUpDown,
  Lock,
} from 'lucide-react';

const DEFAULT_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Education',
  'Medical',
  'Bills',
  'Travel',
  'Work',
  'Home',
  'Personal',
  'Other',
];

const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer', 'Online/Wallet', 'Other'] as const;

export const PersonalExpenses: React.FC = () => {
  const { expenses, addExpense, deleteExpense } = usePersonal();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PersonalExpense | null>(null);

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'week' | 'month'>('month');

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('Food');
  const [customCategory, setCustomCategory] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PersonalExpense['paymentMethod']>('Card');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Calculations
  const stats = useMemo(() => {
    return personalService.calculateExpenseStats(expenses);
  }, [expenses]);

  const openAdd = () => {
    setEditingExpense(null);
    setTitle('');
    setAmount('');
    setCategory('Food');
    setCustomCategory('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setPaymentMethod('Card');
    setNotes('');
    setIsAddModalOpen(true);
  };

  const openEdit = (exp: PersonalExpense) => {
    setEditingExpense(exp);
    setTitle(exp.title);
    setAmount(String(exp.amount));
    if (DEFAULT_CATEGORIES.includes(exp.category)) {
      setCategory(exp.category);
      setCustomCategory('');
    } else {
      setCategory('Other');
      setCustomCategory(exp.category);
    }
    setDate(exp.date);
    setDescription(exp.description || '');
    setPaymentMethod(exp.paymentMethod || 'Card');
    setNotes(exp.notes || '');
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!title.trim() || isNaN(num) || num <= 0) return;

    const effCategory = category === 'Other' && customCategory.trim()
      ? customCategory.trim()
      : category;

    setLoading(true);
    try {
      if (editingExpense) {
        await personalService.updateExpense(editingExpense.ownerId, editingExpense.id, {
          title: title.trim(),
          amount: num,
          category: effCategory,
          date,
          description: description.trim() || undefined,
          paymentMethod,
          notes: notes.trim() || undefined,
        });
      } else {
        await addExpense({
          title: title.trim(),
          amount: num,
          category: effCategory,
          date,
          description: description.trim() || undefined,
          paymentMethod,
          notes: notes.trim() || undefined,
        });
      }
      setIsAddModalOpen(false);
    } catch (err) {
      console.warn('Could not save expense:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered expenses list
  const filtered = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    return expenses.filter((e) => {
      // Date range filter
      if (dateRangeFilter === 'today' && e.date !== todayStr) return false;
      if (dateRangeFilter === 'week' && e.date < weekAgoStr) return false;
      if (dateRangeFilter === 'month' && e.date < monthStartStr) return false;

      // Category filter
      if (selectedCategory !== 'all' && e.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // Payment Method filter
      if (selectedPaymentMethod !== 'all' && e.paymentMethod !== selectedPaymentMethod) {
        return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesDesc = e.description?.toLowerCase().includes(q);
        const matchesNotes = e.notes?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesNotes) return false;
      }

      return true;
    });
  }, [expenses, dateRangeFilter, selectedCategory, selectedPaymentMethod, search]);

  const filteredTotal = filtered.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-emerald-600" />
              Personal Expenses
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Private
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Track your personal spending, subscriptions, and discretionary expenses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsReportOpen(true)}
            icon={<PieChart className="w-4 h-4" />}
          >
            Expense Report
          </Button>
          <Button size="sm" onClick={openAdd} icon={<Plus className="w-4 h-4" />}>
            Add Expense
          </Button>
        </div>
      </div>

      {/* Calculations Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today</span>
          <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
            ${stats.todaySpending.toLocaleString()}
          </p>
        </Card>

        <Card className="p-3.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">This Week</span>
          <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
            ${stats.weekSpending.toLocaleString()}
          </p>
        </Card>

        <Card className="p-3.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">This Month</span>
          <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
            ${stats.monthSpending.toLocaleString()}
          </p>
        </Card>

        <Card className="p-3.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">All Time</span>
          <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
            ${stats.totalSpending.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['month', 'week', 'today', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRangeFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                dateRangeFilter === r
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {r === 'month' ? 'This Month' : r === 'week' ? 'This Week' : r === 'today' ? 'Today' : 'All Time'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="all">All Categories</option>
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-3.5 h-3.5" />}
            className="w-40 sm:w-48 text-xs"
          />
        </div>
      </div>

      {/* Expenses Table / Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1 text-xs text-slate-400">
          <span>Showing {filtered.length} expenses</span>
          <span className="font-bold text-slate-700 dark:text-slate-300">
            Filtered Total: ${filteredTotal.toLocaleString()}
          </span>
        </div>

        {filtered.map((item) => (
          <Card key={item.id} className="p-3.5 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {item.title}
                  </h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {item.category}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                  <span>{item.date}</span>
                  {item.paymentMethod && <span>• {item.paymentMethod}</span>}
                  {item.description && <span className="line-clamp-1 italic">• {item.description}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                ${Number(item.amount).toFixed(2)}
              </span>

              <Button
                size="sm"
                variant="ghost"
                className="p-1.5"
                onClick={() => openEdit(item)}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="p-1.5 text-rose-500 hover:text-rose-700"
                onClick={() => deleteExpense(item.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
            <DollarSign className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No personal expenses yet.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Add your private discretionary expenses to stay on top of personal finances.
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingExpense ? 'Edit Personal Expense' : 'Add Personal Expense'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Expense Title *"
            placeholder="e.g. Lunch with coworker, Tech subscription, Books"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="0.01"
              label="Amount ($) *"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Input
              type="date"
              label="Date *"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`text-xs px-3 py-1 rounded-xl font-medium transition-all ${
                    category === c
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            {category === 'Other' && (
              <div className="mt-2">
                <Input
                  placeholder="Custom category name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Short Note (optional)"
              placeholder="e.g. reimbursed, personal card"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description (optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details or vendor name..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={loading}>
              {editingExpense ? 'Save Changes' : 'Record Expense'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Monthly Report Modal */}
      <Modal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} title="Monthly Expense Report" maxWidth="md">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Month Total</span>
              <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                ${stats.monthSpending.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Entries</span>
              <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                {stats.count}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Largest</span>
              <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1 truncate">
                {stats.largestExpense ? `$${stats.largestExpense.amount}` : '$0'}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Spending by Category
            </h4>
            <div className="space-y-1.5">
              {Object.entries(stats.categoryTotals).map(([cat, amt]) => {
                const pct = stats.totalSpending > 0 ? ((amt / stats.totalSpending) * 100).toFixed(0) : '0';
                return (
                  <div key={cat} className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{cat}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">{pct}%</span>
                      <strong className="font-extrabold text-slate-900 dark:text-slate-100">
                        ${amt.toLocaleString()}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button size="sm" onClick={() => setIsReportOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
