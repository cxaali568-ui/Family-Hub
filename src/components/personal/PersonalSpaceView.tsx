import React from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { useLanguage } from '../../context/LanguageContext';
import { PersonalLockScreen } from './PersonalLockScreen';
import { PersonalDashboard } from './PersonalDashboard';
import { PersonalExpenses } from './PersonalExpenses';
import { PersonalTasks } from './PersonalTasks';
import { PersonalAIChat } from './PersonalAIChat';
import { PersonalNotebook } from './PersonalNotebook';
import { PersonalDailyNeeds } from './PersonalDailyNeeds';
import { PersonalPlans } from './PersonalPlans';
import { PersonalReminders } from './PersonalReminders';
import { PersonalCalendar } from './PersonalCalendar';
import { PersonalPhotos } from './PersonalPhotos';
import { PersonalDocuments } from './PersonalDocuments';
import { PersonalReports } from './PersonalReports';
import { PersonalSettings } from './PersonalSettings';

import {
  Lock,
  LayoutDashboard,
  DollarSign,
  Briefcase,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Compass,
  Bell,
  Calendar as CalendarIcon,
  Image as ImageIcon,
  FileText,
  BarChart3,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { PersonalNavRoute } from '../../types';

export const PersonalSpaceView: React.FC = () => {
  const { isLocked, currentPersonalRoute, setCurrentPersonalRoute, lockNow, profile } = usePersonal();
  const { t } = useLanguage();

  if (isLocked) {
    return <PersonalLockScreen />;
  }

  // Exact Step 11 suggested navigation:
  // Personal Dashboard, Expenses, School / Work, AI Chat, Photos, Documents, Notebook, Daily Needs, Plans, Reminders, Reports, Settings
  const tabs: { id: PersonalNavRoute | 'calendar'; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'expenses', label: 'Expenses', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'school_work', label: 'School / Work', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'ai_chat', label: 'AI Chat', icon: <Sparkles className="w-4 h-4 text-indigo-500" /> },
    { id: 'photos', label: 'Photos', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
    { id: 'notebook', label: 'Notebook', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'daily_needs', label: 'Daily Needs', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'plans', label: 'Plans', icon: <Compass className="w-4 h-4" /> },
    { id: 'reminders', label: 'Reminders', icon: <Bell className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* ----------------- Top Private Navigation Bar ----------------- */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 shrink-0 sticky top-0 z-10 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Lock className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Private Personal Space
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Encrypted Vault
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Partitioned by your unique account ID. Strictly isolated from Family Space.
              </p>
            </div>
          </div>

          <button
            onClick={lockNow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Lock Personal Space immediately"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Space</span>
          </button>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentPersonalRoute(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                currentPersonalRoute === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ----------------- Content Area ----------------- */}
      <div className="flex-1 p-3 sm:p-6 max-w-6xl mx-auto w-full">
        {currentPersonalRoute === 'dashboard' && <PersonalDashboard />}
        {currentPersonalRoute === 'expenses' && <PersonalExpenses />}
        {currentPersonalRoute === 'school_work' && <PersonalTasks />}
        {currentPersonalRoute === 'ai_chat' && <PersonalAIChat />}
        {currentPersonalRoute === 'photos' && <PersonalPhotos />}
        {currentPersonalRoute === 'documents' && <PersonalDocuments />}
        {currentPersonalRoute === 'notebook' && <PersonalNotebook />}
        {currentPersonalRoute === 'daily_needs' && <PersonalDailyNeeds />}
        {currentPersonalRoute === 'plans' && <PersonalPlans />}
        {currentPersonalRoute === 'reminders' && <PersonalReminders />}
        {currentPersonalRoute === 'reports' && <PersonalReports />}
        {currentPersonalRoute === 'settings' && <PersonalSettings />}
      </div>
    </div>
  );
};
