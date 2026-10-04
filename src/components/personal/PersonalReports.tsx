import React, { useState } from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { personalService } from '../../services/personalService';
import {
  FileText,
  Download,
  Printer,
  DollarSign,
  Compass,
  CheckCircle2,
  Lock,
  Calendar,
  Layers,
} from 'lucide-react';

export const PersonalReports: React.FC = () => {
  const { expenses, plans, dailyNeeds, schoolWork, notes } = usePersonal();
  const { user } = useAuth();

  const [exporting, setExporting] = useState(false);

  const stats = personalService.calculateExpenseStats(expenses);

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const data = await personalService.exportPersonalData(user.id);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `FamilyHub_Personal_Data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn('Could not export personal data:', e);
    } finally {
      setExporting(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const completedNeeds = dailyNeeds.filter((n) => n.status === 'completed');
  const activePlans = plans.filter((p) => p.status === 'active' || p.status === 'planned');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              Personal Reports & Data Export
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Private
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Export your monthly summary and download full records securely.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportData}
            loading={exporting}
            icon={<Download className="w-4 h-4" />}
          >
            Export All Data (JSON)
          </Button>
          <Button
            size="sm"
            onClick={handlePrintReport}
            icon={<Printer className="w-4 h-4" />}
          >
            Print Monthly Report
          </Button>
        </div>
      </div>

      {/* Printable Report Summary */}
      <Card className="p-6 space-y-6 shadow-xs border border-slate-200 dark:border-slate-800" id="personal-printable-report">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
              Personal Space Monthly Report
            </h3>
            <p className="text-xs text-slate-400">
              Prepared for: {user?.name || user?.email} • {new Date().toLocaleDateString([], { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Confidential
          </span>
        </div>

        {/* Financial Highlights */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Financial Breakdown
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase">This Month Spending</span>
              <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                ${stats.monthSpending.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Logged</span>
              <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                ${stats.totalSpending.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Expense Count</span>
              <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                {stats.count}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Largest Item</span>
              <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1 truncate">
                {stats.largestExpense ? `$${stats.largestExpense.amount}` : '$0'}
              </p>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(stats.categoryTotals).map(([cat, amt]) => (
              <span key={cat} className="text-xs px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                {cat}: <strong className="font-bold">${amt.toLocaleString()}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* Goals & Plans Highlights */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-500" />
            Active Personal Plans ({activePlans.length})
          </h4>
          <div className="space-y-2">
            {activePlans.map((p) => (
              <div key={p.id} className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">{p.title}</h5>
                  <p className="text-[11px] text-slate-400">{p.category} • Target: {p.endDate || 'Ongoing'}</p>
                </div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{p.progress}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* School / Work Summary */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Completed Errands & Daily Needs ({completedNeeds.length})
          </h4>
          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
            {completedNeeds.slice(0, 5).map((n) => (
              <div key={n.id} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{n.title}</span>
                <span className="text-[10px] text-slate-400">({n.dueDate})</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
