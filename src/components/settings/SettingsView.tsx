import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { usePersonal } from '../../context/PersonalContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Settings, Globe, Moon, Sun, Monitor, Lock, Shield, Users, Key, Copy, Check, LogOut } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { family } = useFamily();
  const { profile, enableLock, disableLock } = usePersonal();

  const [copiedCode, setCopiedCode] = useState(false);
  const [pinInput, setPinInput] = useState('1234');
  const [pinSaved, setPinSaved] = useState(false);

  const handleCopyCode = () => {
    if (!family?.inviteCode) return;
    navigator.clipboard.writeText(family.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleToggleLock = () => {
    if (profile?.isLockEnabled) {
      disableLock();
    } else {
      enableLock(pinInput || '1234');
      setPinSaved(true);
      setTimeout(() => setPinSaved(false), 2500);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          {t.settings.title}
        </h1>
        <p className="text-xs text-slate-500">
          Preferences, language, security, and family organization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Language & Internationalization */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.settings.language}
              </h3>
              <p className="text-xs text-slate-400">English & Urdu (اردو) with native RTL</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLanguage('en')}
              className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                language === 'en'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <span className="text-sm">English</span>
              <span className="text-[10px] text-slate-400 font-normal">Left to Right (LTR)</span>
            </button>

            <button
              onClick={() => setLanguage('ur')}
              className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                language === 'ur'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <span className="text-sm font-urdu">اردو</span>
              <span className="text-[10px] text-slate-400 font-normal">Right to Left (RTL)</span>
            </button>
          </div>
        </Card>

        {/* Appearance Theme */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.settings.theme}
              </h3>
              <p className="text-xs text-slate-400">Light, Dark, and System default</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'light', label: t.settings.light, icon: <Sun className="w-4 h-4" /> },
              { id: 'dark', label: t.settings.dark, icon: <Moon className="w-4 h-4" /> },
              { id: 'system', label: t.settings.system, icon: <Monitor className="w-4 h-4" /> },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setTheme(item.id as any)}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  theme === item.id
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Personal Space Security & Lock */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-950 text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.settings.personalLock}
              </h3>
              <p className="text-xs text-slate-400">Protect private notes & budget with a PIN</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  PIN Security Protection
                </p>
                <p className="text-[11px] text-slate-400">
                  {profile?.isLockEnabled ? 'Active (Current PIN: 1234)' : 'Disabled'}
                </p>
              </div>
              <Button
                variant={profile?.isLockEnabled ? 'danger' : 'primary'}
                size="sm"
                onClick={handleToggleLock}
              >
                {profile?.isLockEnabled ? t.personal.disableLock : t.personal.enableLock}
              </Button>
            </div>

            {pinSaved && (
              <p className="text-xs text-emerald-600 font-semibold animate-in fade-in">
                ✓ Personal Space PIN protection saved!
              </p>
            )}
          </div>
        </Card>

          {/* Family Management & Invite Code */}
          {family && (
            <Card className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {family.name}
                  </h3>
                  <p className="text-xs text-slate-400">{family.settings?.currency || 'USD'} • Family ID: {family.id.slice(0, 12)}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">
                    {t.settings.familyInviteCode}
                  </p>
                  <p className="text-base font-mono font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider">
                    {family.inviteCode || 'N/A'}
                  </p>
                </div>
                {family.inviteCode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                    className="text-xs"
                    icon={copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedCode ? t.settings.copied : t.settings.copyCode}
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Account Info and Logout */}
        <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Logged in as {user?.name}
            </h4>
            <p className="text-xs text-slate-400">
              {user?.email} • Role: {(user?.roleInFamily || 'Member').toUpperCase()}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            icon={<LogOut className="w-4 h-4 text-rose-500" />}
            className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/40"
          >
            {t.auth.logout}
          </Button>
        </Card>
      </div>
    );
  };
