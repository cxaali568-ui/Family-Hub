import React from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Lock, DollarSign, CheckSquare, BookOpen, Bot, Shield, Plus, Sparkles } from 'lucide-react';

export const PersonalDashboard: React.FC = () => {
  const { user } = useAuth();
  const { expenses, tasks, notes, setCurrentPersonalRoute, lockNow } = usePersonal();
  const { t } = useLanguage();

  const totalSpent = expenses.reduce((acc, e) => acc + e.amount, 0);
  const pendingTasks = tasks.filter(t => !t.completed).length;

  return (
    <div className="space-y-6">
      {/* Privacy Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-5 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-indigo-500/20 text-indigo-400">
                <Shield className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                {t.privateSpaceBadge}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">
              {user?.name}'s Private Vault
            </h2>
            <p className="text-xs text-slate-400 max-w-md">
              {t.privateNotice}
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
              {t.personal.lockNow}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCurrentPersonalRoute('ai_chat')}
              className="text-xs bg-indigo-600 hover:bg-indigo-700"
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              {t.personal.aiChat}
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          variant="interactive"
          onClick={() => setCurrentPersonalRoute('expenses')}
          className="flex items-center gap-3.5"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Private Spent</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              ${totalSpent.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-400">{expenses.length} records</p>
          </div>
        </Card>

        <Card
          variant="interactive"
          onClick={() => setCurrentPersonalRoute('school_work')}
          className="flex items-center gap-3.5"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">School / Work</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {pendingTasks} <span className="text-xs font-normal text-slate-400">pending</span>
            </p>
            <p className="text-[11px] text-slate-400">{tasks.length} total tasks</p>
          </div>
        </Card>

        <Card
          variant="interactive"
          onClick={() => setCurrentPersonalRoute('notebook')}
          className="flex items-center gap-3.5"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Secret Notebook</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {notes.length}
            </p>
            <p className="text-[11px] text-slate-400">Private journal & thoughts</p>
          </div>
        </Card>
      </div>

      {/* Quick Personal Previews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Recent Personal Tasks */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-600" />
              Recent Personal Tasks
            </h3>
            <button
              onClick={() => setCurrentPersonalRoute('school_work')}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {tasks.slice(0, 3).map(task => (
              <div
                key={task.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs"
              >
                <span className={task.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-medium'}>
                  {task.title}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold uppercase">
                  {task.type}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Private Notebook Preview */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              Private Notes
            </h3>
            <button
              onClick={() => setCurrentPersonalRoute('notebook')}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Open Notebook
            </button>
          </div>
          <div className="space-y-2">
            {notes.slice(0, 2).map(n => (
              <div
                key={n.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60"
              >
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{n.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                  {n.content}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
