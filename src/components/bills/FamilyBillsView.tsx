import React, { useState, useEffect, useMemo } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingState } from '../ui/LoadingState';
import { EmptyState } from '../ui/EmptyState';
import { AddBillModal, getBillTypeIcon } from './AddBillModal';
import { PayBillModal } from './PayBillModal';
import { BillDetailModal } from './BillDetailModal';
import { billService } from '../../services/billService';
import { billTypeService } from '../../services/billTypeService';
import { billTemplateService } from '../../services/billTemplateService';
import { billReportService } from '../../services/billReportService';
import { billReminderService } from '../../services/billReminderService';
import { memberProfileService } from '../../services/memberProfileService';
import {
  Bill,
  BillType,
  BillTemplate,
  BillPayment,
  FamilyMemberProfile,
  MonthlyBillReport,
} from '../../types';
import {
  Receipt,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  Repeat,
  Layers,
  Pause,
  Play,
  Eye,
  BarChart3,
  CalendarDays,
  Tag,
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

export const FamilyBillsView: React.FC = () => {
  const { currentFamily, familyPermissions } = useFamily();
  const { user: currentUser } = useAuth();

  // Active Month & Year
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);

  const selectedMonthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const selectedMonthLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  // Tabs: 'all' | 'upcoming' | 'overdue' | 'recurring' | 'report'
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'overdue' | 'recurring' | 'report'>('all');

  // Real-time Data
  const [monthBills, setMonthBills] = useState<Bill[]>([]);
  const [allActiveBills, setAllActiveBills] = useState<Bill[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);

  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const [templates, setTemplates] = useState<BillTemplate[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<FamilyMemberProfile[]>([]);

  // Modals
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [inspectedBill, setInspectedBill] = useState<Bill | null>(null);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [selectedFrequencyFilter, setSelectedFrequencyFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'due_date' | 'amount' | 'recently_added' | 'status'>('due_date');

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

  // 1. Ensure Default Bill Types & Subscribe
  useEffect(() => {
    if (!currentFamily?.id) return;
    if (currentUser?.id) {
      billTypeService.ensureDefaultBillTypes(currentFamily.id, currentUser.id);
    }
    const unsub = billTypeService.subscribeBillTypes(currentFamily.id, (types) => {
      setBillTypes(types);
    });
    return () => unsub();
  }, [currentFamily?.id, currentUser?.id]);

  // 2. Subscribe to Month Bills
  useEffect(() => {
    if (!currentFamily?.id) return;
    setLoadingBills(true);
    setCurrentPage(1);

    const unsub = billService.subscribeMonthBills(currentFamily.id, selectedMonthKey, (bList) => {
      setMonthBills(bList);
      setLoadingBills(false);
    });

    return () => unsub();
  }, [currentFamily?.id, selectedMonthKey]);

  // 3. Subscribe to All Active Bills (for overdue & upcoming across all months)
  useEffect(() => {
    if (!currentFamily?.id) return;
    const unsub = billService.subscribeAllActiveBills(currentFamily.id, (list) => {
      setAllActiveBills(list);
      // Background check for reminders
      if (currentUser) {
        billReminderService.checkAndSendBillReminders(currentFamily.id, list, currentUser);
      }
    });
    return () => unsub();
  }, [currentFamily?.id, currentUser?.id]);

  // 4. Subscribe to Recurring Templates
  useEffect(() => {
    if (!currentFamily?.id) return;
    const unsub = billTemplateService.subscribeTemplates(currentFamily.id, (tpls) => {
      setTemplates(tpls);
    });
    return () => unsub();
  }, [currentFamily?.id]);

  // 5. Subscribe to Member Profiles (for Payer dropdown)
  useEffect(() => {
    if (!currentFamily?.id) return;
    const unsub = memberProfileService.subscribeMemberProfiles(currentFamily.id, (mList) => {
      setMemberProfiles(mList);
    });
    return () => unsub();
  }, [currentFamily?.id]);

  // Month navigation
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

  // Monthly Summary Calculations (Section 4, 28, 29)
  const summary = useMemo(() => {
    return billReportService.calculateBillSummary(allActiveBills, selectedMonthKey);
  }, [allActiveBills, selectedMonthKey]);

  // Filtered & Sorted Bills for "All Bills" Tab
  const filteredBills = useMemo(() => {
    let list = [...monthBills];

    if (selectedStatusFilter !== 'all') {
      list = list.filter((b) => b.status === selectedStatusFilter);
    }

    if (selectedTypeFilter !== 'all') {
      list = list.filter((b) => b.billTypeId === selectedTypeFilter);
    }

    if (selectedFrequencyFilter === 'recurring') {
      list = list.filter((b) => b.isRecurringInstance);
    } else if (selectedFrequencyFilter === 'onetime') {
      list = list.filter((b) => !b.isRecurringInstance);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.providerName?.toLowerCase().includes(q) ||
          b.billTypeName?.toLowerCase().includes(q) ||
          b.accountNumberMasked?.toLowerCase().includes(q) ||
          b.accountNumberFull?.toLowerCase().includes(q) ||
          b.referenceNumber?.toLowerCase().includes(q) ||
          b.notes?.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'due_date') return a.dueDate.localeCompare(b.dueDate);
      if (sortBy === 'amount') return b.amount - a.amount;
      if (sortBy === 'recently_added')
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return 0;
    });

    return list;
  }, [monthBills, selectedStatusFilter, selectedTypeFilter, selectedFrequencyFilter, searchQuery, sortBy]);

  // Paginated bills
  const totalPages = Math.max(1, Math.ceil(filteredBills.length / PAGE_SIZE));
  const paginatedBills = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBills.slice(start, start + PAGE_SIZE);
  }, [filteredBills, currentPage]);

  const handleExportCSV = () => {
    if (!currentFamily) return;
    const reportData: MonthlyBillReport = {
      familyName: currentFamily.name,
      currency,
      year: selectedYear,
      month: selectedMonth,
      monthLabel: selectedMonthLabel,
      summary,
      bills: monthBills,
    };
    billReportService.exportToCSV(reportData);
    showToast('Monthly bills report exported to CSV.');
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: Bill['status']) => {
    switch (status) {
      case 'Paid':
        return <Badge variant="success">Paid</Badge>;
      case 'Partially Paid':
        return <Badge variant="warning">Partially Paid</Badge>;
      case 'Overdue':
        return <Badge variant="danger">Overdue</Badge>;
      case 'Cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="primary">Pending</Badge>;
    }
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
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* HEADER & MONTH SELECTOR (Section 4, 30, 31)                   */}
      {/* ------------------------------------------------------------- */}
      <div className="p-5 md:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Family Bills
              </h1>
              <p className="text-xs text-slate-500">
                {currentFamily.name} • Utility, rent, internet & recurring obligations
              </p>
            </div>
          </div>
        </div>

        {/* Month Selector & Controls */}
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

          {/* Add Bill Button */}
          <Button
            variant="primary"
            onClick={() => {
              setEditingBill(null);
              setIsAddBillOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
            className="font-bold shadow-sm"
          >
            Add Bill
          </Button>

          {/* Export & Print */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportCSV}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Export CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Print Monthly Bills"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ALERT BANNERS: DUE TODAY & OVERDUE (Section 26, 27)           */}
      {/* ------------------------------------------------------------- */}
      {summary.todayBills.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{summary.todayBills.length} Bill{summary.todayBills.length > 1 ? 's' : ''} Due Today:</strong>{' '}
              {summary.todayBills.map((b) => `${b.providerName} (${currency} ${b.remainingAmount.toLocaleString()})`).join(', ')}
            </span>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setPayingBill(summary.todayBills[0]);
            }}
          >
            Pay Now
          </Button>
        </div>
      )}

      {summary.totalOverdue > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center justify-between text-xs font-semibold text-rose-900 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Overdue Bills:</strong> {currency} {summary.totalOverdue.toLocaleString()} overdue across {summary.overdueCount} bill{summary.overdueCount > 1 ? 's' : ''}.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('overdue')}
            className="text-xs font-bold text-rose-700 dark:text-rose-300 hover:underline"
          >
            View Overdue ({summary.overdueBills.length})
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TOP DASHBOARD METRIC CARDS (Section 4)                        */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Due */}
        <Card className="p-4 rounded-3xl flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400">Total Expected</span>
          <div className="mt-2">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
              {currency} {summary.totalExpected.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{summary.billCount} bills in {selectedMonthLabel}</p>
          </div>
        </Card>

        {/* Paid This Month */}
        <Card className="p-4 rounded-3xl flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400">Paid This Month</span>
          <div className="mt-2">
            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {currency} {summary.totalPaid.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{summary.paidCount} bills settled</p>
          </div>
        </Card>

        {/* Pending */}
        <Card className="p-4 rounded-3xl flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400">Pending</span>
          <div className="mt-2">
            <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400">
              {currency} {summary.totalPending.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{summary.pendingCount} bills pending</p>
          </div>
        </Card>

        {/* Overdue */}
        <Card className="p-4 rounded-3xl flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400">Overdue</span>
          <div className="mt-2">
            <h3
              className={`text-xl font-black ${
                summary.totalOverdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {currency} {summary.totalOverdue.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{summary.overdueCount} bills past due</p>
          </div>
        </Card>

        {/* Upcoming */}
        <Card className="p-4 rounded-3xl flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400">Due Next 7 Days</span>
          <div className="mt-2">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
              {currency}{' '}
              {summary.upcomingBills
                .reduce((acc, curr) => acc + curr.remainingAmount, 0)
                .toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{summary.upcomingBills.length} upcoming bills</p>
          </div>
        </Card>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* NAVIGATION TABS                                               */}
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
            <span>All Bills ({monthBills.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'upcoming'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Upcoming ({summary.upcomingBills.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overdue'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue ({summary.overdueBills.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('recurring')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'recurring'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Recurring Schedules ({templates.length})</span>
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
            <span>Monthly Breakdown</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: ALL BILLS (Section 6, 19, 39, 40, 41)                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by provider, bill type, account no, notes..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => {
                  setSelectedStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-2 font-medium text-slate-700 dark:text-slate-300 border-0"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              {/* Bill Type Filter */}
              <select
                value={selectedTypeFilter}
                onChange={(e) => {
                  setSelectedTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-2 font-medium text-slate-700 dark:text-slate-300 border-0"
              >
                <option value="all">All Types</option>
                {billTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {/* Frequency Filter */}
              <select
                value={selectedFrequencyFilter}
                onChange={(e) => {
                  setSelectedFrequencyFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-2 font-medium text-slate-700 dark:text-slate-300 border-0"
              >
                <option value="all">All Frequencies</option>
                <option value="recurring">Recurring Only</option>
                <option value="onetime">One-time Only</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-2 font-medium text-slate-700 dark:text-slate-300 border-0"
              >
                <option value="due_date">Due Date</option>
                <option value="amount">Amount</option>
                <option value="recently_added">Recently Added</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>

          {/* Bill Cards Grid (Section 6) */}
          {loadingBills ? (
            <LoadingState message="Loading monthly bills..." />
          ) : filteredBills.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-8 h-8 text-amber-500" />}
              title={searchQuery ? 'No matching bills found' : 'No bills recorded for this period'}
              description={
                searchQuery
                  ? 'Try modifying your search or clearing active filters.'
                  : 'Add your electricity, gas, internet, water, or rent bills to keep track of deadlines.'
              }
              actionLabel="Add First Bill"
              onAction={() => {
                setEditingBill(null);
                setIsAddBillOpen(true);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedBills.map((bill) => (
                <Card
                  key={bill.id}
                  className="p-5 rounded-3xl hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Icon & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          {getBillTypeIcon(bill.billTypeIcon || bill.billTypeName)}
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            {bill.billTypeName}
                          </span>
                          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                            {bill.providerName}
                          </h4>
                        </div>
                      </div>

                      {getStatusBadge(bill.status)}
                    </div>

                    {/* Details: Amount & Due Date */}
                    <div className="mt-4 p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Total Amount:</span>
                        <span className="font-black text-slate-900 dark:text-slate-100 text-sm">
                          {bill.currency} {bill.amount.toLocaleString()}
                        </span>
                      </div>

                      {bill.paidAmount > 0 && bill.status !== 'Paid' && (
                        <div className="flex items-center justify-between text-emerald-600">
                          <span>Paid So Far:</span>
                          <span className="font-semibold">
                            {bill.currency} {bill.paidAmount.toLocaleString()}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-slate-400">Due Date:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {bill.dueDate}
                        </span>
                      </div>

                      {bill.accountNumberMasked && (
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Account:</span>
                          <span className="font-mono">{bill.accountNumberMasked}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInspectedBill(bill)}
                      icon={<Eye className="w-3.5 h-3.5" />}
                    >
                      View
                    </Button>

                    {bill.status !== 'Paid' && bill.status !== 'Cancelled' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setPayingBill(bill)}
                        className="font-bold text-xs"
                      >
                        Pay Bill
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 text-xs">
              <span className="text-slate-400">
                Page {currentPage} of {totalPages}
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

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: UPCOMING BILLS (Section 25)                            */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Due Soon</span>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                Upcoming Bills ({summary.upcomingBills.length})
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Bills due within the next 7 days
              </p>
            </div>
          </div>

          {summary.upcomingBills.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
              No bills due in the next 7 days.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.upcomingBills.map((b) => (
                <Card key={b.id} className="p-4 rounded-3xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getBillTypeIcon(b.billTypeIcon || b.billTypeName)}
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{b.providerName}</h4>
                      </div>
                      {getStatusBadge(b.status)}
                    </div>
                    <div className="mt-3 space-y-1 text-xs">
                      <p className="text-slate-400">Due: <strong className="text-slate-800 dark:text-slate-200">{b.dueDate}</strong></p>
                      <p className="text-lg font-black text-slate-900 dark:text-slate-100">
                        {b.currency} {b.remainingAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setInspectedBill(b)}>
                      View
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => setPayingBill(b)}>
                      Pay Now
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: OVERDUE BILLS (Section 26)                             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'overdue' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-rose-500">Overdue Obligations</span>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                Overdue Bills ({summary.overdueBills.length})
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Outstanding bills whose due dates have passed
              </p>
            </div>
          </div>

          {summary.overdueBills.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
              No overdue bills. All deadlines are up to date!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.overdueBills.map((b) => (
                <Card key={b.id} className="p-5 rounded-3xl border-rose-200 dark:border-rose-900 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getBillTypeIcon(b.billTypeIcon || b.billTypeName)}
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{b.providerName}</h4>
                      </div>
                      <Badge variant="danger">Overdue</Badge>
                    </div>

                    <div className="mt-3 space-y-1 text-xs">
                      <p className="text-rose-600 font-semibold">Due Date was: {b.dueDate}</p>
                      <p className="text-lg font-black text-slate-900 dark:text-slate-100">
                        {b.currency} {b.remainingAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setInspectedBill(b)}>
                      View
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setPayingBill(b)}>
                      Pay Bill
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: RECURRING SCHEDULES (Section 33, 34, 35)               */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'recurring' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Automated Schedules</span>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                Recurring Bills ({templates.length})
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Templates that automatically schedule upcoming monthly or quarterly bill instances
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingBill(null);
                setIsAddBillOpen(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Recurring Bill
            </Button>
          </div>

          {templates.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
              No recurring bill templates configured yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <Card key={tpl.id} className="p-5 rounded-3xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getBillTypeIcon(tpl.billTypeIcon || tpl.billTypeName)}
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{tpl.providerName}</h4>
                          <span className="text-[10px] text-slate-400 capitalize">{tpl.frequency}</span>
                        </div>
                      </div>

                      <Badge variant={tpl.active ? 'success' : 'secondary'}>
                        {tpl.active ? 'Active' : 'Paused'}
                      </Badge>
                    </div>

                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Amount:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {tpl.amountType === 'fixed'
                            ? `Rs. ${tpl.defaultAmount.toLocaleString()} (Fixed)`
                            : 'Variable each period'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Next Scheduled Due:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{tpl.nextDueDate}</span>
                      </div>
                      {tpl.accountNumberMasked && (
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Account:</span>
                          <span className="font-mono">{tpl.accountNumberMasked}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    {tpl.active ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await billTemplateService.pauseTemplate(
                            currentFamily.id,
                            tpl.id,
                            tpl.providerName,
                            currentUser!
                          );
                          showToast(`Paused recurring schedule for "${tpl.providerName}".`);
                        }}
                        icon={<Pause className="w-3.5 h-3.5" />}
                      >
                        Pause
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await billTemplateService.resumeTemplate(
                            currentFamily.id,
                            tpl.id,
                            tpl.providerName,
                            currentUser!
                          );
                          showToast(`Resumed recurring schedule for "${tpl.providerName}".`);
                        }}
                        icon={<Play className="w-3.5 h-3.5" />}
                      >
                        Resume
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: MONTHLY BREAKDOWN & REPORT (Section 28, 32, 49)        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          <Card className="p-5 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Monthly Bills by Type ({selectedMonthLabel})
            </h3>

            {summary.billsByType.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No bill records for this month.</p>
            ) : (
              <div className="space-y-3">
                {summary.billsByType.map((t) => (
                  <div key={t.billTypeId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                        {getBillTypeIcon(t.icon || t.billTypeName)}
                        <span>{t.billTypeName}</span>
                        <span className="text-[11px] font-normal text-slate-400">
                          ({t.count} bill{t.count > 1 ? 's' : ''})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-slate-900 dark:text-slate-100">
                          {currency} {t.amount.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-2">{t.percentage}%</span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${Math.min(100, t.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS                                                        */}
      {/* ------------------------------------------------------------- */}
      <AddBillModal
        isOpen={isAddBillOpen}
        onClose={() => {
          setIsAddBillOpen(false);
          setEditingBill(null);
        }}
        familyId={currentFamily.id}
        currentUser={currentUser!}
        billTypes={billTypes}
        editBill={editingBill}
        currency={currency}
        onBillSaved={(bill, isEdit) => {
          showToast(isEdit ? 'Bill updated successfully.' : 'Bill added successfully.');
        }}
      />

      <PayBillModal
        isOpen={Boolean(payingBill)}
        onClose={() => setPayingBill(null)}
        familyId={currentFamily.id}
        bill={payingBill}
        currentUser={currentUser!}
        memberProfiles={memberProfiles}
        onPaymentRecorded={(payment, updated) => {
          showToast(`Payment of ${updated.currency} ${payment.amount.toLocaleString()} recorded.`);
        }}
      />

      <BillDetailModal
        isOpen={Boolean(inspectedBill)}
        onClose={() => setInspectedBill(null)}
        familyId={currentFamily.id}
        bill={inspectedBill}
        currentUser={currentUser!}
        canManage={familyPermissions.canManageMembers}
        currency={currency}
        onPay={(bill) => {
          setInspectedBill(null);
          setPayingBill(bill);
        }}
        onEdit={(bill) => {
          setInspectedBill(null);
          setEditingBill(bill);
          setIsAddBillOpen(true);
        }}
        onCancelBill={async (bill) => {
          await billService.cancelBill(currentFamily.id, bill.id, bill.providerName, currentUser!);
          showToast('Bill marked as Cancelled.');
        }}
      />
    </div>
  );
};
