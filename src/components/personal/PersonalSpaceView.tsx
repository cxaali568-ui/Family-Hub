import React from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { useLanguage } from '../../context/LanguageContext';
import { PersonalLockScreen } from './PersonalLockScreen';
import { PersonalDashboard } from './PersonalDashboard';
import { PersonalExpenses } from './PersonalExpenses';
import { PersonalTasks } from './PersonalTasks';
import { PersonalAIChat } from './PersonalAIChat';
import { PersonalNotebook } from './PersonalNotebook';
import { Lock, LayoutDashboard, DollarSign, CheckSquare, Sparkles, BookOpen, ShieldCheck } from 'lucide-react';
import { PersonalNavRoute } from '../../types';

export const PersonalSpaceView: React.FC = () => {
  const { isLocked, currentPersonalRoute, setCurrentPersonalRoute, lockNow, profile } = usePersonal();
  const { t } = useLanguage();

  if (isLocked) {
    return <PersonalLockScreen />;
  }

  const tabs: { id: PersonalNavRoute; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: t.personal.dashboard, icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'ai_chat', label: t.personal.aiChat, icon: <Sparkles className="w-4 h-4 text-indigo-500" /> },
    { id: 'expenses', label: t.personal.expenses, icon: <DollarSign className="w-4 h-4" /> },
    { id: 'school_work', label: t.personal.schoolWork, icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'notebook', label: t.personal.notebook, icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Top Private Navigation Bar */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-950 text-indigo-400">
              <Lock className="w-4 h-4" />
            </span>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {t.personal.title}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Private
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Encrypted isolated session
              </p>
            </div>
          </div>

          <button
            onClick={lockNow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Lock Personal Space immediately"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{t.personal.lockNow}</span>
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentPersonalRoute(tab.id)}
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

      {/* Content Area */}
      <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
        {currentPersonalRoute === 'dashboard' && <PersonalDashboard />}
        {currentPersonalRoute === 'ai_chat' && <PersonalAIChat />}
        {currentPersonalRoute === 'expenses' && <PersonalExpenses />}
        {currentPersonalRoute === 'school_work' && <PersonalTasks />}
        {currentPersonalRoute === 'notebook' && <PersonalNotebook />}
      </div>
    </div>
  );
};
