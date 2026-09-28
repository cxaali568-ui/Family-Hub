import React, { useState } from 'react';
import { Lock, KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { usePersonal } from '../../context/PersonalContext';
import { useLanguage } from '../../context/LanguageContext';

export const PersonalLockScreen: React.FC = () => {
  const { unlockWithPin } = usePersonal();
  const { t } = useLanguage();

  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);
      if (nextPin.length === 4) {
        // Auto check on 4th digit
        setTimeout(() => {
          const ok = unlockWithPin(nextPin);
          if (!ok) {
            setError(true);
            setPin('');
          }
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleQuickDemoUnlock = () => {
    unlockWithPin('1234');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center max-w-sm mx-auto">
      {/* Privacy Lock Icon */}
      <div className="w-16 h-16 rounded-3xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-xl shadow-indigo-950/40">
        <Lock className="w-8 h-8" />
      </div>

      <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
        {t.personal.lockTitle}
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 mb-6 max-w-xs leading-relaxed">
        {t.personal.lockDesc}
      </p>

      {/* PIN Dots Display */}
      <div className="flex items-center gap-3 mb-6">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-200 ${
              pin.length > i
                ? 'bg-indigo-600 scale-110 shadow-sm shadow-indigo-500/50'
                : 'bg-slate-200 dark:bg-slate-800'
            } ${error ? 'bg-rose-500 animate-shake' : ''}`}
          />
        ))}
      </div>

      {error && (
        <p className="text-xs text-rose-500 font-semibold mb-4 animate-in fade-in">
          {t.personal.wrongPin}
        </p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-64 mb-6">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="w-18 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-lg font-bold text-slate-800 dark:text-slate-100 shadow-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/50 active:scale-95 transition-all cursor-pointer"
          >
            {d}
          </button>
        ))}
        <button
          onClick={handleQuickDemoUnlock}
          className="w-18 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
          title="Demo shortcut (1234)"
        >
          Demo
        </button>
        <button
          onClick={() => handleDigit('0')}
          className="w-18 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-lg font-bold text-slate-800 dark:text-slate-100 shadow-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/50 active:scale-95 transition-all cursor-pointer"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          className="w-18 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/50 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          ⌫
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Hardware encrypted • Isolated session storage</span>
      </div>
    </div>
  );
};
