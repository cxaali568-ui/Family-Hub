import React, { useState, useEffect, useMemo } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { LoadingState } from '../ui/LoadingState';
import { EmptyState } from '../ui/EmptyState';
import { AddExpenseModal, getCategoryIconComponent } from './AddExpenseModal';
import { ExpenseDetailModal } from './ExpenseDetailModal';
import { SetBudgetModal } from './SetBudgetModal';
import { AddCategoryModal } from './AddCategoryModal';
import { expenseService } from '../../services/expenseService';
import { expenseCategoryService } from '../../services/expenseCategoryService';
import { budgetService } from '../../services/budgetService';
import { expenseReportService } from '../../services/expenseReportService';
import { memberProfileService } from '../../services/memberProfileService';
import {
  Expense,
  ExpenseCategory,
  FamilyBudget,
  FamilyMemberProfile,
  ExpenseFilter,
  MonthlyExpenseReport,
} from '../../types';
import {
  DollarSign,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Printer,
  TrendingUp,
  CreditCard,
  User as UserIcon,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Paperclip,
  Check,
  Tag,
  BarChart3,
  CalendarDays,
  FileSpreadsheet,
} from 'lucide-react';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const FamilyExpensesView: React.FC = () => {
  const { currentFamily, familyPermissions } = useFamily();
  const { user: currentUser } = useAuth();

  // Active Month & Year Selection
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1); // 1-12

  const selectedMonthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const selectedMonthLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  // Sub-view Tab: 'all' | 'today' | 'week' | 'report' | 'categories'
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'week' | 'report' | 'categories'>('all');

  // Real-time Data States
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [budget, setBudget] = useState<FamilyBudget | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<FamilyMemberProfile[]>([]);

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [inspectedExpense, setInspectedExpense] = useState<Expense | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedPayerFilter, setSelectedPayerFilter] = useState('all');
  const [selectedPersonFilter, setSelectedPersonFilter] = useState('all');
  const [selectedPaymentMethodFilter, setSelectedPaymentMethodFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Pagination (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const currency = 'PKR';

  // 1. Ensure Default Categories & Subscribe Categories
  useEffect(() => {
    if (!currentFamily?.id) return;
    if (currentUser?.id) {
      expenseCategoryService.ensureDefaultCategories(currentFamily.id, currentUser.id);
    }
    const unsub = expenseCategoryService.subscribeCategories(currentFamily.id, (cats) => {
      setCategories(cats);
    });
    return () => unsub();
  }, [currentFamily?.id, currentUser?.id]);

  // 2. Subscribe to Budget for the active month
  useEffect(() => {
    if (!currentFamily?.id) return;
    const unsub = budgetService.subscribeBudget(currentFamily.id, selectedMonthKey, (b) => {
      setBudget(b);
    });
    return () => unsub();
  }, [currentFamily?.id, selectedMonthKey]);

  // 3. Subscribe to Expenses for the active month
  useEffect(() => {
    if (!currentFamily?.id) return;
    setLoadingExpenses(true);
    setCurrentPage(1);

    const unsub = expenseService.subscribeMonthExpenses(
      currentFamily.id,
      selectedMonthKey,
      (list) => {
        setExpenses(list);
        setLoadingExpenses(false);
      }
    );

    return () => unsub();
  }, [currentFamily?.id, selectedMonthKey]);

  // 4. Subscribe to Member Profiles for Payer / For Person Dropdowns
  useEffect(() => {
    if (!currentFamily?.id) return;
    const unsub = memberProfileService.subscribeMemberProfiles(currentFamily.id, (mList) => {
      setMemberProfiles(mList);
    });
    return () => unsub();
  }, [currentFamily?.id]);

  // Month navigation handlers
  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((prev) => prev - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((prev) => prev + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // Comprehensive Monthly Summary Calculations (Section 25-36)
  const summary = useMemo(() => {
    return expenseReportService.calculateMonthSummary(expenses, budget, selectedMonthKey);
  }, [expenses, budget, selectedMonthKey]);

  // Distinct Payers and Persons for Filters
  const distinctPayers = useMemo(() => {
    const s = new Set<string>();
    expenses.forEach((e) => e.paidByName && s.add(e.paidByName));
    return Array.from(s);
  }, [expenses]);

  const distinctPersons = useMemo(() => {
    const s = new Set<string>();
    expenses.forEach((e) => e.forPersonName && s.add(e.forPersonName));
    return Array.from(s);
  }, [expenses]);

  // Filtered & Sorted Expenses for "All Expenses" Tab
  const filteredExpenses = useMemo(() => {
    let list = expenses.filter((e) => !e.deletedAt);

    if (selectedCategoryFilter !== 'all') {
      list = list.filter((e) => e.categoryId === selectedCategoryFilter);
    }

    if (selectedPayerFilter !== 'all') {
      list = list.filter((e) => e.paidByName === selectedPayerFilter);
    }

    if (selectedPersonFilter !== 'all') {
      list = list.filter((e) => e.forPersonName === selectedPersonFilter);
    }

    if (selectedPaymentMethodFilter !== 'all') {
      list = list.filter((e) => e.paymentMethod === selectedPaymentMethodFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.description?.toLowerCase().includes(q) ||
          e.categoryName?.toLowerCase().includes(q) ||
          e.paidByName?.toLowerCase().includes(q) ||
          e.forPersonName?.toLowerCase().includes(q) ||
          e.notes?.toLowerCase().includes(q) ||
          String(e.amount).includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'newest') {
        const d = b.expenseDate.localeCompare(a.expenseDate);
        return d !== 0 ? d : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        const d = a.expenseDate.localeCompare(b.expenseDate);
        return d !== 0 ? d : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'highest') {
        return b.amount - a.amount;
      }
      if (sortBy === 'lowest') {
        return a.amount - b.amount;
      }
      return 0;
    });

    return list;
  }, [
    expenses,
    selectedCategoryFilter,
    selectedPayerFilter,
    selectedPersonFilter,
    selectedPaymentMethodFilter,
    searchQuery,
    sortBy,
  ]);

  // Paginated Expenses
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredExpenses.slice(start, start + PAGE_SIZE);
  }, [filteredExpenses, currentPage]);

  // Section 20: Today's Expenses & Total
  const todayStr = new Date().toISOString().split('T')[0];
  const todayExpenses = useMemo(() => {
    return expenses.filter((e) => !e.deletedAt && e.expenseDate === todayStr);
  }, [expenses, todayStr]);

  const todayTotal = useMemo(() => {
    let sumMinor = 0;
    todayExpenses.forEach((e) => {
      sumMinor += e.amountMinor !== undefined ? e.amountMinor : Math.round(e.amount * 100);
    });
    return sumMinor / 100;
  }, [todayExpenses]);

  // Section 21: This Week's Expenses by Day
  const weekExpensesByDay = useMemo(() => {
    const curr = new Date();
    // Monday as start of week
    const firstDay = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1);
    const days: Array<{ dayName: string; dateStr: string; expenses: Expense[]; total: number }> = [];

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let weekTotalMinor = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(curr.getFullYear(), curr.getMonth(), firstDay + i);
      const dStr = d.toISOString().split('T')[0];
      const dayList = expenses.filter((e) => !e.deletedAt && e.expenseDate === dStr);
      let daySumMinor = 0;
      dayList.forEach((e) => {
        daySumMinor += e.amountMinor !== undefined ? e.amountMinor : Math.round(e.amount * 100);
      });
      weekTotalMinor += daySumMinor;
      days.push({
        dayName: dayNames[i],
        dateStr: dStr,
        expenses: dayList,
        total: daySumMinor / 100,
      });
    }

    return { days, weeklyTotal: weekTotalMinor / 100 };
  }, [expenses]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!currentFamily) return;
    const reportData: MonthlyExpenseReport = {
      familyName: currentFamily.name,
      currency,
      year: selectedYear,
      month: selectedMonth,
      monthLabel: selectedMonthLabel,
      summary,
      expenses,
    };
    expenseReportService.exportToCSV(reportData);
    showToast('Monthly expense report exported to CSV.');
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  if (!currentFamily) {
    return (
      <div className="p-8 text-center text-slate-500">
        No active family space loaded.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Toast Alert Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER & MONTH SELECTOR (Section 3, 23, 24)               */}
      {/* ------------------------------------------------------------- */}
      <div className="p-5 md:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Family Expenses
              </h1>
              <p className="text-xs text-slate-500">
                {currentFamily.name} • Daily spending, monthly accounting & household budgets
              </p>
            </div>
          </div>
        </div>

        {/* Month Switcher Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 text-xs font-bold">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 text-slate-900 dark:text-slate-100 min-w-36 text-center font-extrabold">
              {selectedMonthLabel}
            </span>

            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Add Expense Button */}
          <Button
            variant="primary"
            onClick={() => {
              setEditingExpense(null);
              setIsAddExpenseOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
            className="font-bold shadow-sm"
          >
            Add Expense
          </Button>

          {/* Set Budget */}
          <Button
            variant="outline"
            onClick={() => setIsBudgetModalOpen(true)}
            icon={<TargetIcon />}
          >
            {budget ? 'Edit Budget' : 'Set Budget'}
          </Button>

          {/* Export & Print */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportCSV}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Export CSV Report"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Print Monthly Report"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* INFORMATIONAL BUDGET WARNING BANNER (Section 35)              */}
      {/* ------------------------------------------------------------- */}
      {summary.budgetStatus !== 'normal' && budget && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold ${
            summary.budgetStatus === 'exceeded'
              ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
              : summary.budgetStatus === 'reached'
              ? 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200'
              : 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {summary.budgetStatus === 'exceeded'
                ? 'Monthly spending is above the set budget.'
                : summary.budgetStatus === 'reached'
                ? 'Monthly budget reached.'
                : '80% of monthly budget used.'}
            </span>
          </div>
          <span className="text-[11px] opacity-80">
            {summary.budgetUsagePercentage}% used • {currency === 'PKR' ? 'Rs.' : currency}{' '}
            {summary.totalSpent.toLocaleString()} of {budget.amount.toLocaleString()}
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TOP SUMMARY CARDS (Section 3)                                 */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spent */}
        <Card className="p-4 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Spent</span>
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {currency === 'PKR' ? 'Rs.' : currency} {summary.totalSpent.toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {summary.transactionCount} transactions recorded in {selectedMonthLabel}
            </p>
          </div>
        </Card>

        {/* Daily Average */}
        <Card className="p-4 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Daily Average</span>
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {currency === 'PKR' ? 'Rs.' : currency} {summary.dailyAverage.toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Average spent per day this month
            </p>
          </div>
        </Card>

        {/* Monthly Budget */}
        <Card className="p-4 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Monthly Budget</span>
            <button
              onClick={() => setIsBudgetModalOpen(true)}
              className="text-xs text-indigo-600 hover:underline font-bold"
            >
              {budget ? 'Change' : 'Set'}
            </button>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {budget
                ? `${currency === 'PKR' ? 'Rs.' : currency} ${budget.amount.toLocaleString()}`
                : 'Not Set'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {budget ? `${summary.budgetUsagePercentage}% of budget spent` : 'Click to set monthly limit'}
            </p>
          </div>
        </Card>

        {/* Remaining Budget */}
        <Card className="p-4 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Remaining</span>
            <span
              className={`p-2 rounded-xl text-xs font-bold ${
                summary.remainingBudget >= 0
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60'
              }`}
            >
              {budget ? `${Math.max(0, 100 - summary.budgetUsagePercentage).toFixed(0)}% Left` : 'N/A'}
            </span>
          </div>
          <div className="mt-3">
            <h3
              className={`text-2xl font-black ${
                summary.remainingBudget >= 0
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {budget
                ? `${currency === 'PKR' ? 'Rs.' : currency} ${summary.remainingBudget.toLocaleString()}`
                : '—'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {budget
                ? summary.remainingBudget >= 0
                  ? 'Remaining balance available'
                  : 'Over budget limit'
                : 'Set budget to track balance'}
            </p>
          </div>
        </Card>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PRIMARY NAVIGATION TABS (Section 19, 20, 21, 26, 28)          */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1 text-xs font-bold overflow-x-auto">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Expenses ({expenses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('today')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'today'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Today ({currency === 'PKR' ? 'Rs.' : currency} {todayTotal.toLocaleString()})</span>
          </button>

          <button
            onClick={() => setActiveTab('week')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'week'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>This Week ({currency === 'PKR' ? 'Rs.' : currency} {weekExpensesByDay.weeklyTotal.toLocaleString()})</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'report'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Monthly Breakdown & Report</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Categories ({categories.length})</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: ALL EXPENSES LIST (Section 19, 40, 41, 42, 43)         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by description, category, payer, person, notes, amount..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => {
                  setSelectedCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-2 font-medium text-slate-700 dark:text-slate-300 border-0"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Paid By Filter */}
              {distinctPayers.length > 0 && (
                <select
                  value={selectedPayerFilter}
                  onChange={(e) => {
                    setSelectedPayerFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-2 font-medium text-slate-700 dark:text-slate-300 border-0"
                >
                  <option value="all">All Payers</option>
                  {distinctPayers.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}

              {/* For Person Filter */}
              {distinctPersons.length > 0 && (
                <select
                  value={selectedPersonFilter}
                  onChange={(e) => {
                    setSelectedPersonFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-2 font-medium text-slate-700 dark:text-slate-300 border-0"
                >
                  <option value="all">All For Persons</option>
                  {distinctPersons.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}

              {/* Payment Method Filter */}
              <select
                value={selectedPaymentMethodFilter}
                onChange={(e) => {
                  setSelectedPaymentMethodFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-2 font-medium text-slate-700 dark:text-slate-300 border-0"
              >
                <option value="all">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Bank">Bank</option>
                <option value="Online">Online</option>
                <option value="Mobile Wallet">Mobile Wallet</option>
                <option value="Other">Other</option>
              </select>

              {/* Sort Selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-2 font-medium text-slate-700 dark:text-slate-300 border-0"
              >
                <option value="newest">Newest Date</option>
                <option value="oldest">Oldest Date</option>
                <option value="highest">Highest Amount</option>
                <option value="lowest">Lowest Amount</option>
              </select>
            </div>
          </div>

          {/* Expense Rows List */}
          {loadingExpenses ? (
            <LoadingState message="Loading monthly expenses..." />
          ) : filteredExpenses.length === 0 ? (
            <EmptyState
              icon={<DollarSign className="w-8 h-8 text-emerald-500" />}
              title={searchQuery ? 'No matching expenses found' : 'No expenses recorded for this period'}
              description={
                searchQuery
                  ? 'Try modifying your search or clearing active filters.'
                  : 'Start tracking daily household expenses, groceries, school fees, and fuel.'
              }
              actionLabel="Add First Expense"
              onAction={() => {
                setEditingExpense(null);
                setIsAddExpenseOpen(true);
              }}
            />
          ) : (
            <div className="space-y-2.5">
              {paginatedExpenses.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => setInspectedExpense(exp)}
                  className="p-3.5 md:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs transition-all flex items-center justify-between cursor-pointer gap-3"
                >
                  {/* Left: Category Icon & Description */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                      {getCategoryIconComponent(exp.categoryIcon || exp.categoryName)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {exp.description}
                        </h4>
                        <Badge variant="primary" className="text-[10px]">
                          {exp.categoryName}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>Paid by: <strong className="text-slate-600 dark:text-slate-300">{exp.paidByName}</strong></span>
                        {exp.forPersonName && exp.forPersonName !== 'Family' && (
                          <>
                            <span>•</span>
                            <span>For: <strong className="text-slate-600 dark:text-slate-300">{exp.forPersonName}</strong></span>
                          </>
                        )}
                        <span>•</span>
                        <span>{exp.paymentMethod}</span>
                        {exp.receiptUrl && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-500 font-semibold flex items-center gap-0.5">
                              <Paperclip className="w-3 h-3" /> Receipt
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Date */}
                  <div className="text-right shrink-0">
                    <div className="text-base font-black text-slate-900 dark:text-slate-100">
                      {currency === 'PKR' ? 'Rs.' : currency} {exp.amount.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(exp.expenseDate).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 text-xs">
                  <span className="text-slate-400">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1} to{' '}
                    {Math.min(currentPage * PAGE_SIZE, filteredExpenses.length)} of{' '}
                    {filteredExpenses.length} expenses
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="px-2 font-bold text-slate-700 dark:text-slate-300">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: TODAY'S EXPENSES (Section 20)                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'today' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Today's Total</span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                {currency === 'PKR' ? 'Rs.' : currency} {todayTotal.toLocaleString()}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {todayExpenses.length} transactions recorded today ({new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })})
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingExpense(null);
                setIsAddExpenseOpen(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Today's Expense
            </Button>
          </div>

          {todayExpenses.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
              No expenses recorded for today yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {todayExpenses.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => setInspectedExpense(exp)}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:shadow-xs flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold">
                      {getCategoryIconComponent(exp.categoryIcon || exp.categoryName)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {exp.description}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {exp.categoryName} • Paid by {exp.paidByName}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-slate-900 dark:text-slate-100">
                      {currency === 'PKR' ? 'Rs.' : currency} {exp.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: THIS WEEK'S EXPENSES (Section 21)                      */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'week' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Weekly Total</span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                {currency === 'PKR' ? 'Rs.' : currency} {weekExpensesByDay.weeklyTotal.toLocaleString()}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Total spending across Monday to Sunday of the current week
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {weekExpensesByDay.days.map((day) => (
              <Card key={day.dateStr} className="p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {day.dayName}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(day.dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1.5 min-h-16">
                    {day.expenses.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No expenses</p>
                    ) : (
                      day.expenses.map((e) => (
                        <div
                          key={e.id}
                          onClick={() => setInspectedExpense(e)}
                          className="flex items-center justify-between text-xs cursor-pointer hover:text-indigo-600"
                        >
                          <span className="truncate pr-2">{e.description}</span>
                          <span className="font-semibold shrink-0">
                            {currency === 'PKR' ? 'Rs.' : currency} {e.amount.toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold mt-2">
                  <span className="text-slate-500">Day Total:</span>
                  <span className="text-emerald-600">
                    {currency === 'PKR' ? 'Rs.' : currency} {day.total.toLocaleString()}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: MONTHLY BREAKDOWN & REPORT (Section 26-33, 57)         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          {/* Key Reporting Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 rounded-3xl">
              <span className="text-xs font-bold text-slate-400">Total Transactions</span>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {summary.transactionCount}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Recorded in {selectedMonthLabel}</p>
            </Card>

            <Card className="p-4 rounded-3xl">
              <span className="text-xs font-bold text-slate-400">Average Transaction</span>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {currency === 'PKR' ? 'Rs.' : currency} {summary.averageTransaction.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Per receipt or purchase</p>
            </Card>

            <Card className="p-4 rounded-3xl">
              <span className="text-xs font-bold text-slate-400">Largest Single Expense</span>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {summary.largestExpense
                  ? `${currency === 'PKR' ? 'Rs.' : currency} ${summary.largestExpense.amount.toLocaleString()}`
                  : '—'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {summary.largestExpense ? summary.largestExpense.description : 'No records'}
              </p>
            </Card>
          </div>

          {/* Category Breakdown (Section 26 & 27) */}
          <Card className="p-5 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Spending by Category ({selectedMonthLabel})
                </h3>
                <p className="text-xs text-slate-400">
                  Sorted by expenditure descending with percentages
                </p>
              </div>
            </div>

            {summary.categoryTotals.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No expense data available for this period.</p>
            ) : (
              <div className="space-y-3">
                {summary.categoryTotals.map((cat) => (
                  <div key={cat.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                        {getCategoryIconComponent(cat.icon || cat.categoryName)}
                        <span>{cat.categoryName}</span>
                        <span className="text-[11px] font-normal text-slate-400">
                          ({cat.count} purchases)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-slate-900 dark:text-slate-100">
                          {currency === 'PKR' ? 'Rs.' : currency} {cat.amount.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-2">
                          {cat.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Visual Bar */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Payer & Person Breakdown Grid (Section 32, 33) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Paid By Summary */}
            <Card className="p-5 rounded-3xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-indigo-500" />
                <span>Paid By (Payer Summary)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Factual record of who paid expenses
              </p>

              {summary.payerTotals.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No records</p>
              ) : (
                <div className="space-y-2 pt-1">
                  {summary.payerTotals.map((p) => (
                    <div
                      key={p.payerName}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {p.payerName}
                        </span>
                        <p className="text-[11px] text-slate-400">{p.count} transactions</p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900 dark:text-slate-100">
                          {currency === 'PKR' ? 'Rs.' : currency} {p.amount.toLocaleString()}
                        </span>
                        <p className="text-[11px] text-slate-400">{p.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* For Person Summary */}
            <Card className="p-5 rounded-3xl space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>For Person / Purpose</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Who or what the expense was dedicated to
              </p>

              {summary.personTotals.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No records</p>
              ) : (
                <div className="space-y-2 pt-1">
                  {summary.personTotals.map((p) => (
                    <div
                      key={p.personName}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {p.personName}
                        </span>
                        <p className="text-[11px] text-slate-400">{p.count} transactions</p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900 dark:text-slate-100">
                          {currency === 'PKR' ? 'Rs.' : currency} {p.amount.toLocaleString()}
                        </span>
                        <p className="text-[11px] text-slate-400">{p.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Daily Spending Trend Timeline (Section 57) */}
          <Card className="p-5 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Daily Spending Trend ({selectedMonthLabel})
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 max-h-60 overflow-y-auto pt-1">
              {summary.dailyTotals.map((day) => (
                <div
                  key={day.date}
                  className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                    day.amount > 0
                      ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900'
                      : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 font-bold">{day.dayLabel}</span>
                  <div className="mt-1">
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 block">
                      {currency === 'PKR' ? 'Rs.' : currency} {day.amount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400">{day.count} items</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: CATEGORIES (Section 8, 10)                             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Expense Categories ({categories.length})
              </h3>
              <p className="text-xs text-slate-400">
                Standard and custom categories for your family expenses
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddCategoryOpen(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Custom Category
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {categories.map((cat) => (
              <Card key={cat.id} className="p-3.5 rounded-2xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 shrink-0">
                    {getCategoryIconComponent(cat.icon || cat.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {cat.name}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {cat.isCustom ? 'Custom' : 'Standard'}
                    </span>
                  </div>
                </div>

                {cat.isCustom && familyPermissions.canManageSettings && (
                  <button
                    onClick={async () => {
                      if (confirm(`Archive category "${cat.name}"? Existing expenses will be preserved.`)) {
                        await expenseCategoryService.deactivateCategory(
                          currentFamily.id,
                          cat.id,
                          cat.name,
                          currentUser!
                        );
                        showToast(`Archived category "${cat.name}".`);
                      }
                    }}
                    className="text-[10px] text-rose-500 hover:underline"
                  >
                    Archive
                  </button>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS                                                        */}
      {/* ------------------------------------------------------------- */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
        }}
        familyId={currentFamily.id}
        currentUser={currentUser!}
        categories={categories}
        memberProfiles={memberProfiles}
        editExpense={editingExpense}
        defaultMonthKey={selectedMonthKey}
        currency={currency}
        onExpenseSaved={(exp, isEdit) => {
          showToast(isEdit ? 'Expense updated successfully.' : 'Expense recorded successfully.');
        }}
      />

      <ExpenseDetailModal
        isOpen={Boolean(inspectedExpense)}
        onClose={() => setInspectedExpense(null)}
        expense={inspectedExpense}
        currentUser={currentUser!}
        canManage={familyPermissions.canManageMembers}
        currency={currency}
        onEdit={(exp) => {
          setInspectedExpense(null);
          setEditingExpense(exp);
          setIsAddExpenseOpen(true);
        }}
        onDelete={async (exp) => {
          await expenseService.deleteExpense(
            currentFamily.id,
            exp.id,
            exp.description,
            currentUser!
          );
          showToast('Expense deleted.');
        }}
      />

      <SetBudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        familyId={currentFamily.id}
        year={selectedYear}
        month={selectedMonth}
        monthLabel={selectedMonthLabel}
        currentBudget={budget}
        totalSpent={summary.totalSpent}
        currentUser={currentUser!}
        currency={currency}
        onBudgetSaved={(b) => {
          setBudget(b);
          showToast(`Monthly budget saved for ${selectedMonthLabel}.`);
        }}
      />

      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        familyId={currentFamily.id}
        currentUser={currentUser!}
        onCategoryAdded={(cat) => {
          showToast(`Custom category "${cat.name}" added.`);
        }}
      />
    </div>
  );
};

const TargetIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);
