import React from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Lock,
  DollarSign,
  CheckSquare,
  BookOpen,
  Shield,
  Plus,
  Sparkles,
  Calendar,
  Clock,
  FileText,
  Bell,
  Compass,
  Upload,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  File,
} from 'lucide-react';

export const PersonalDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    expenses,
    schoolWork,
    notes,
    dailyNeeds,
    plans,
    reminders,
    files,
    setCurrentPersonalRoute,
    lockNow,
  } = usePersonal();

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Today calculations
  const todayReminders = reminders.filter((r) => r.date === todayStr && r.status !== 'completed');
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  const todayExpenseTotal = todayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const todaySchoolWork = schoolWork.filter((sw) => sw.date === todayStr && sw.status !== 'completed');
  const todayNeeds = dailyNeeds.filter((dn) => dn.dueDate === todayStr && dn.status !== 'completed');
  const overdueNeeds = dailyNeeds.filter((dn) => dn.dueDate < todayStr && dn.status !== 'completed');

  // Recents
  const recentNotes = notes.slice(0, 3);
  const recentFiles = files.slice(0, 3);
  const recentExpenses = expenses.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* ----------------- Top Privacy Banner & Greeting ----------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-5 sm:p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-indigo-500/20 text-indigo-400">
                <Shield className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                PERSONAL SPACE — PRIVATE & ENCRYPTED
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {getGreeting()}, {user?.name || 'Friend'}
            </h2>
            <p className="text-xs text-slate-400 max-w-lg">
              This space belongs strictly to you. No family administrators or members can access your private items.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={lockNow}
              className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800"
              icon={<Lock className="w-3.5 h-3.5" />}
            >
              Lock Now
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCurrentPersonalRoute('ai_chat')}
              className="text-xs bg-indigo-600 hover:bg-indigo-700"
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Private AI
            </Button>
          </div>
        </div>
      </div>

      {/* ----------------- Quick Actions Bar ----------------- */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          <button
            type="button"
            onClick={() => setCurrentPersonalRoute('expenses')}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 text-left transition-all group shadow-2xs"
          >
            <DollarSign className="w-4 h-4 text-emerald-500 mb-1" />
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block truncate">
              + Expense
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentPersonalRoute('notebook')}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 text-left transition-all group shadow-2xs"
          >
            <BookOpen className="w-4 h-4 text-indigo-500 mb-1" />
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block truncate">
              + Note
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentPersonalRoute('reminders')}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 text-left transition-all group shadow-2xs"
          >
            <Bell className="w-4 h-4 text-orange-500 mb-1" />
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block truncate">
              + Reminder
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentPersonalRoute('daily_needs')}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 text-left transition-all group shadow-2xs"
          >
            <CheckCircle2 className="w-4 h-4 text-teal-500 mb-1" />
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block truncate">
              + Need
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentPersonalRoute('plans')}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 text-left transition-all group shadow-2xs"
          >
            <Compass className="w-4 h-4 text-purple-500 mb-1" />
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block truncate">
              + Plan
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentPersonalRoute('school_work')}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 text-left transition-all group shadow-2xs"
          >
            <CheckSquare className="w-4 h-4 text-blue-500 mb-1" />
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block truncate">
              + Task
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentPersonalRoute('documents')}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 text-left transition-all group shadow-2xs"
          >
            <Upload className="w-4 h-4 text-pink-500 mb-1" />
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block truncate">
              + Upload
            </span>
          </button>
        </div>
      </div>

      {/* ----------------- TODAY SECTION ----------------- */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Today's Schedule & Highlights
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Today's Expenses */}
          <Card
            onClick={() => setCurrentPersonalRoute('expenses')}
            className="p-4 cursor-pointer hover:border-emerald-500 transition-all shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Today's Expenses</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">
              ${todayExpenseTotal.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{todayExpenses.length} items logged</p>
          </Card>

          {/* Today's Needs */}
          <Card
            onClick={() => setCurrentPersonalRoute('daily_needs')}
            className="p-4 cursor-pointer hover:border-teal-500 transition-all shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Daily Needs</span>
              <CheckCircle2 className="w-4 h-4 text-teal-500" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">
              {todayNeeds.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {overdueNeeds.length > 0 ? `${overdueNeeds.length} overdue` : 'Up to date'}
            </p>
          </Card>

          {/* Today's School/Work */}
          <Card
            onClick={() => setCurrentPersonalRoute('school_work')}
            className="p-4 cursor-pointer hover:border-indigo-500 transition-all shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">School / Work</span>
              <CheckSquare className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">
              {todaySchoolWork.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Scheduled for today</p>
          </Card>

          {/* Today's Reminders */}
          <Card
            onClick={() => setCurrentPersonalRoute('reminders')}
            className="p-4 cursor-pointer hover:border-orange-500 transition-all shadow-xs"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Reminders</span>
              <Bell className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">
              {todayReminders.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Private nudges</p>
          </Card>
        </div>
      </div>

      {/* ----------------- WIDGETS SECTION ----------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Recent Notes */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Recent Notes
              </h4>
              <button
                onClick={() => setCurrentPersonalRoute('notebook')}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                View all
              </button>
            </div>

            <div className="space-y-2">
              {recentNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setCurrentPersonalRoute('notebook')}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {note.title}
                  </p>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                    {note.content}
                  </p>
                </div>
              ))}

              {recentNotes.length === 0 && (
                <p className="text-xs text-slate-400 italic py-4 text-center">No notes created yet.</p>
              )}
            </div>
          </div>
        </Card>

        {/* Recent Files */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-rose-500" />
                Recent Documents
              </h4>
              <button
                onClick={() => setCurrentPersonalRoute('documents')}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                View all
              </button>
            </div>

            <div className="space-y-2">
              {recentFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setCurrentPersonalRoute('documents')}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {file.name}
                    </p>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      {file.category}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              ))}

              {recentFiles.length === 0 && (
                <p className="text-xs text-slate-400 italic py-4 text-center">No private files yet.</p>
              )}
            </div>
          </div>
        </Card>

        {/* Recent Expenses */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Recent Expenses
              </h4>
              <button
                onClick={() => setCurrentPersonalRoute('expenses')}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                View all
              </button>
            </div>

            <div className="space-y-2">
              {recentExpenses.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => setCurrentPersonalRoute('expenses')}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {exp.title}
                    </p>
                    <span className="text-[10px] text-slate-400">{exp.date} • {exp.category}</span>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                    ${exp.amount}
                  </span>
                </div>
              ))}

              {recentExpenses.length === 0 && (
                <p className="text-xs text-slate-400 italic py-4 text-center">No expenses recorded.</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
