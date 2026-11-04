import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { usePersonal } from '../../context/PersonalContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { UserProfileModal } from '../profile/UserProfileModal';
import {
  Settings,
  Globe,
  Moon,
  Sun,
  Monitor,
  Lock,
  Shield,
  Users,
  Copy,
  Check,
  LogOut,
  Smartphone,
  Camera,
  Trash2,
  HelpCircle,
  FileText,
  Send,
  AlertCircle,
  Building,
  Sparkles,
  Search,
  ChevronDown,
  X,
  Bell,
  Share2,
  Volume2,
} from 'lucide-react';
import { PWAInstallPrompt } from '../ui/PWAInstallPrompt';
import { submitSupportTicket } from '../../services/supportService';
import { useNotifications } from '../../context/NotificationContext';
import { HelpSupportCenter } from '../support/HelpSupportCenter';
import { AdminSupportDashboard } from '../support/AdminSupportDashboard';

export const SettingsView: React.FC = () => {
  const { language, setLanguage, t, supportedLanguages, currentLanguageMeta } = useLanguage();
  const { theme, setTheme, isDark } = useTheme();
  const { user, logout } = useAuth();
  const {
    currentFamily,
    familyRole,
    updateFamilyIdentity,
    uploadFamilyLogo,
  } = useFamily();
  const { profile, enableLock, disableLock } = usePersonal();
  const {
    mobilePushEnabled,
    toggleMobilePush,
    sendTestNotification,
    permissionStatus,
  } = useNotifications();

  // App Sharing State
  const [copiedAppLink, setCopiedAppLink] = useState(false);
  const [testAlertSent, setTestAlertSent] = useState(false);
  const [pushToggling, setPushToggling] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);

  const getAppShareUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://familyhub.app';
  };

  const handleShareApp = async () => {
    const shareUrl = getAppShareUrl();
    const familyName = currentFamily?.name || 'Khan House';
    const inviteCodePart = currentFamily?.inviteCode ? `\nFamily Code: ${currentFamily.inviteCode}` : '';
    const shareText = `Join our family on FamilyHub! Open app: ${shareUrl}${inviteCodePart}`;

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `${familyName} — FamilyHub`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareUrl}${currentFamily?.inviteCode ? ` (Family Code: ${currentFamily.inviteCode})` : ''}`);
      setCopiedAppLink(true);
      setTimeout(() => setCopiedAppLink(false), 2500);
    } catch {}
  };

  const handleCopyAppLink = async () => {
    try {
      await navigator.clipboard.writeText(getAppShareUrl());
      setCopiedAppLink(true);
      setTimeout(() => setCopiedAppLink(false), 2500);
    } catch {}
  };

  const handleTogglePushWithFeedback = async () => {
    setPushToggling(true);
    try {
      const res = await toggleMobilePush();
      if (!res.state) {
        setPushStatusMessage('Device push alerts turned OFF. In-app alerts remain active.');
      } else if (res.permission === 'denied') {
        setPushStatusMessage('Browser blocked notifications. Tap the site/lock icon in your browser to allow.');
      } else {
        setPushStatusMessage('Device push alerts are now ON! You can test them below.');
      }
      setTimeout(() => setPushStatusMessage(null), 4500);
    } finally {
      setPushToggling(false);
    }
  };

  const handleSendTestAlert = async () => {
    setTestAlertSent(true);
    await sendTestNotification();
    setTimeout(() => setTestAlertSent(false), 3000);
  };

  // App Identity State
  const [appName, setAppName] = useState(currentFamily?.name || 'Khan House');
  const [logoUploading, setLogoUploading] = useState(false);
  const [identitySaving, setIdentitySaving] = useState(false);
  const [identitySuccess, setIdentitySuccess] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentFamily?.name) {
      setAppName(currentFamily.name);
    }
  }, [currentFamily?.name]);

  // Modals & Confirmation States
  const [copiedCode, setCopiedCode] = useState(false);
  const [pinInput, setPinInput] = useState('1234');
  const [pinSaved, setPinSaved] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [helpTab, setHelpTab] = useState<'support' | 'privacy' | 'faq'>('support');

  // Language Search & Picker State
  const [langSearchQuery, setLangSearchQuery] = useState('');
  const [showAllLanguages, setShowAllLanguages] = useState(false);

  const filteredLanguages = useMemo(() => {
    const q = langSearchQuery.trim().toLowerCase();
    if (!q) return supportedLanguages;
    return supportedLanguages.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [supportedLanguages, langSearchQuery]);

  // Support Ticket Form State
  const [ticketCategory, setTicketCategory] = useState<'bug' | 'complaint' | 'help' | 'feature'>('help');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState<{ referenceId: string } | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const isFamilyAdmin =
    !familyRole ||
    familyRole === 'owner' ||
    currentFamily?.createdBy === user?.id;

  const handleCopyCode = () => {
    if (!currentFamily?.inviteCode) return;
    navigator.clipboard.writeText(currentFamily.inviteCode);
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

  // App Identity handlers
  const handleSaveIdentity = async () => {
    if (!currentFamily) return;
    const trimmed = appName.trim() || 'Khan House';
    setIdentitySaving(true);
    setIdentityError(null);
    setIdentitySuccess(null);
    try {
      await updateFamilyIdentity({ name: trimmed });
      setIdentitySuccess('App Identity updated successfully! Name is saved.');
      setTimeout(() => setIdentitySuccess(null), 3000);
    } catch (err: any) {
      setIdentityError(err?.message || 'Failed to update app identity.');
    } finally {
      setIdentitySaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentFamily) return;
    setLogoUploading(true);
    setIdentityError(null);
    setIdentitySuccess(null);
    try {
      await uploadFamilyLogo(file);
      setIdentitySuccess('New app logo uploaded and applied across Menu & Headers!');
      setTimeout(() => setIdentitySuccess(null), 3500);
    } catch (err: any) {
      setIdentityError(err?.message || 'Failed to upload app image.');
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentFamily) return;
    setIdentitySaving(true);
    setIdentityError(null);
    setIdentitySuccess(null);
    try {
      await updateFamilyIdentity({ photo: '' });
      setIdentitySuccess('App image removed. Restored default Khan House (KH) logo.');
      setTimeout(() => setIdentitySuccess(null), 3500);
    } catch (err: any) {
      setIdentityError(err?.message || 'Failed to reset app logo.');
    } finally {
      setIdentitySaving(false);
    }
  };

  // Support Ticket submission handler
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim() || !user) return;
    setTicketSubmitting(true);
    setTicketError(null);
    try {
      const res = await submitSupportTicket({
        userId: user.id,
        userEmail: user.email || 'user@familyhub.internal',
        userName: user.name || 'FamilyHub User',
        category: ticketCategory,
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
        familyId: currentFamily?.id,
        familyRole: familyRole || undefined,
      });
      setTicketResult({ referenceId: res.referenceId });
      setTicketSubject('');
      setTicketMessage('');
    } catch (err: any) {
      setTicketError(err?.message || 'Failed to submit support ticket.');
    } finally {
      setTicketSubmitting(false);
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
          FamilyHub app identity, preferences, language, security, and support.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ================= 1. App Identity / FamilyHub Identity ================= */}
        <Card className="space-y-4 md:col-span-2 border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-white via-white to-amber-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  App Identity (FamilyHub Header & Logo)
                </h3>
                <p className="text-xs text-slate-400">
                  Controls the single logo and title displayed at the top of the Menu and Header.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              {isFamilyAdmin ? 'Admin Managed' : 'Family Space'}
            </span>
          </div>

          <div className="p-4 bg-white/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* Current App Logo Preview */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="relative group">
                <Avatar
                  src={currentFamily?.photo || currentFamily?.avatar}
                  name={appName || 'Khan House'}
                  size="xl"
                  className="ring-4 ring-amber-500/20 shadow-md"
                />
                {logoUploading && (
                  <div className="absolute inset-0 bg-slate-900/60 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse">
                    Uploading...
                  </div>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Current App Logo
              </p>
            </div>

            {/* Logo Actions and Display Name Editing */}
            <div className="flex-1 w-full space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  App Display Name
                </label>
                <div className="flex gap-2">
                  <Input
                    value={appName}
                    onChange={e => setAppName(e.target.value)}
                    placeholder="e.g. Khan House"
                    disabled={!isFamilyAdmin || identitySaving}
                    className="text-sm font-bold"
                  />
                  {isFamilyAdmin && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveIdentity}
                      loading={identitySaving}
                      className="shrink-0"
                    >
                      Save Name
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Default: <strong>Khan House</strong>. When no image is uploaded, initials (<strong>KH</strong>) are shown in an amber circle.
                </p>
              </div>

              {/* Image Upload & Reset Controls */}
              {isFamilyAdmin && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    type="file"
                    ref={logoInputRef}
                    onChange={handleLogoUpload}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    loading={logoUploading}
                    icon={<Camera className="w-3.5 h-3.5 text-indigo-600" />}
                    className="text-xs"
                  >
                    Upload New App Logo
                  </Button>

                  {(currentFamily?.photo || currentFamily?.avatar) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLogo}
                      loading={identitySaving}
                      icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                      className="text-xs text-rose-600 border-rose-200 dark:border-rose-900/40 hover:bg-rose-50"
                    >
                      Restore Default (KH)
                    </Button>
                  )}
                </div>
              )}

              {/* Status messages */}
              {identitySuccess && (
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                  <Check className="w-4 h-4" />
                  <span>{identitySuccess}</span>
                </p>
              )}
              {identityError && (
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4" />
                  <span>{identityError}</span>
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* ================= 2. Language & Internationalization (Search & Select) ================= */}
        <Card className="space-y-4 md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{t.settings.language}</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    Search & Select
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Search any language to switch instantly. Urdu, Arabic, and Persian automatically enable RTL layout.
                </p>
              </div>
            </div>
            {/* Active Language Badge */}
            <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/60 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 self-start sm:self-auto shrink-0 flex items-center gap-2">
              <span className="text-base">{currentLanguageMeta.flag}</span>
              <span className="font-semibold">{currentLanguageMeta.nativeName}</span>
              <span className="text-indigo-400">({currentLanguageMeta.name})</span>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-indigo-200/50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                {currentLanguageMeta.dir.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={langSearchQuery}
              onChange={(e) => setLangSearchQuery(e.target.value)}
              placeholder="Search language (e.g. Urdu, English, Arabic, Spanish, French, Chinese, German)..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
            />
            {langSearchQuery && (
              <button
                type="button"
                onClick={() => setLangSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* When user is actively searching: Show ONLY matched results */}
          {langSearchQuery.trim() !== '' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1">
                <span>Search results ({filteredLanguages.length})</span>
                <span>Click to select</span>
              </div>
              {filteredLanguages.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-400">
                    No languages found matching "{langSearchQuery}".
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[260px] overflow-y-auto pr-1">
                  {filteredLanguages.map((lang) => {
                    const isSelected = language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setLanguage(lang.code);
                          setLangSearchQuery('');
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2 text-left ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg shrink-0">{lang.flag}</span>
                          <div className="truncate">
                            <p className={`text-xs font-bold truncate ${lang.dir === 'rtl' ? 'font-urdu' : ''}`}>
                              {lang.nativeName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-normal truncate">
                              {lang.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                            {lang.dir.toUpperCase()}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* When not searching: Clean compact layout with quick picks and optional expansion */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1">
                <span>Frequently Used Languages</span>
                <button
                  type="button"
                  onClick={() => setShowAllLanguages(!showAllLanguages)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>{showAllLanguages ? 'Hide full list' : 'View all 20 languages'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllLanguages ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Quick Picks */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  supportedLanguages.find((l) => l.code === 'en')!,
                  supportedLanguages.find((l) => l.code === 'ur')!,
                  supportedLanguages.find((l) => l.code === 'ar')!,
                  supportedLanguages.find((l) => l.code === language && !['en', 'ur', 'ar'].includes(language)) ||
                    supportedLanguages.find((l) => l.code === 'es')!,
                ]
                  .filter(Boolean)
                  .map((lang) => {
                    const isSelected = language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setLanguage(lang.code)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2 text-left ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{lang.flag}</span>
                          <div className="truncate">
                            <span className={`block text-xs font-bold truncate ${lang.dir === 'rtl' ? 'font-urdu' : ''}`}>
                              {lang.nativeName}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-normal truncate">
                              {lang.name}
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}
              </div>

              {/* Expanded full list only if toggled */}
              {showAllLanguages && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[260px] overflow-y-auto pr-1">
                    {supportedLanguages.map((lang) => {
                      const isSelected = language === lang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => setLanguage(lang.code)}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-start gap-1 text-left ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-base">{lang.flag}</span>
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                              {lang.dir.toUpperCase()}
                            </span>
                          </div>
                          <span className={`text-xs font-semibold truncate w-full ${lang.dir === 'rtl' ? 'font-urdu' : ''}`}>
                            {lang.nativeName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal truncate w-full">
                            {lang.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ================= 3. Appearance Theme ================= */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
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
            <div className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
              {theme === 'system' ? `System (${isDark ? 'Dark' : 'Light'})` : theme}
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
                type="button"
                onClick={() => setTheme(item.id as any)}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  theme === item.id
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* ================= Notifications & Device Alerts ================= */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Notifications & Device Alerts</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    mobilePushEnabled
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {mobilePushEnabled ? 'Push ON' : 'In-App Only'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Important family alerts & optional phone push delivery</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3">
            {/* 1. In-app notifications indicator (always active) */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  In-App Notification Center
                </p>
                <p className="text-[11px] text-slate-400">
                  Always displays alerts in top bell icon, urgent banners & family chat
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                Always Active
              </span>
            </div>

            <hr className="border-slate-200/60 dark:border-slate-700/60" />

            {/* 2. Optional Mobile & Device Push Notifications Toggle */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Mobile & Browser Push Alerts
                  </p>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Send notifications to phone or desktop lockscreen (Optional ON/OFF)
                </p>
              </div>

              <button
                type="button"
                onClick={handleTogglePushWithFeedback}
                disabled={pushToggling}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  mobilePushEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                title={mobilePushEnabled ? 'Turn OFF device push notifications' : 'Turn ON device push notifications'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    mobilePushEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Push Status Feedback Message */}
            {pushStatusMessage && (
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 animate-in fade-in flex items-center gap-1.5">
                <span>✓ {pushStatusMessage}</span>
              </p>
            )}

            {/* Test Alert Button (When ON) */}
            {mobilePushEnabled && (
              <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Verify alerts on your device lockscreen:
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendTestAlert}
                  className="text-xs font-bold"
                  icon={testAlertSent ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-600" />}
                >
                  {testAlertSent ? 'Alert Dispatched!' : 'Send Test Alert'}
                </Button>
              </div>
            )}

            {/* Permission Denied Guide */}
            {permissionStatus === 'denied' && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Notifications blocked in browser
                </p>
                <p>
                  To receive phone lockscreen alerts, tap the lock/site settings icon in your browser URL bar and change Notifications to <strong>Allow</strong>.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* ================= 4. Personal Space Security & Lock ================= */}
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

        {/* ================= 5. Family Management & Invite Code ================= */}
        {currentFamily && (
          <Card className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {currentFamily.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {currentFamily.settings?.currency || 'USD'} • Family ID: {currentFamily.id.slice(0, 12)}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase">
                  {t.settings.familyInviteCode}
                </p>
                <p className="text-base font-mono font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider">
                  {currentFamily.inviteCode || 'N/A'}
                </p>
              </div>
              {currentFamily.inviteCode && (
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

        {/* ================= 6. Install Mobile Web App (PWA) ================= */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.settings.installPwa || 'Install Mobile App (PWA)'}
              </h3>
              <p className="text-xs text-slate-400">
                Install FamilyHub to your Android or iPhone Home Screen for fast, standalone access.
              </p>
            </div>
          </div>
          <PWAInstallPrompt variant="banner" />
        </Card>

        {/* ================= Share FamilyHub App Link ================= */}
        <Card className="p-4 space-y-3.5 border-indigo-200/60 dark:border-indigo-900/40 bg-gradient-to-br from-white via-white to-indigo-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Share App Link</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Share FamilyHub with family members so they can open and join directly
                </p>
              </div>
            </div>
          </div>

          {/* Share Link Input Box */}
          <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <input
              type="text"
              readOnly
              value={getAppShareUrl()}
              className="bg-transparent border-0 text-xs font-mono text-slate-700 dark:text-slate-200 flex-1 px-1 focus:outline-none select-all"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyAppLink}
              className="text-xs font-bold shrink-0"
              icon={copiedAppLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copiedAppLink ? 'Copied!' : 'Copy'}
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="primary"
              onClick={handleShareApp}
              icon={<Share2 className="w-3.5 h-3.5" />}
              className="font-bold text-xs"
            >
              Share via Phone / Device
            </Button>

            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `Assalam o Alaikum! Join our family space on FamilyHub: ${getAppShareUrl()}${
                  currentFamily?.inviteCode ? ` (Family Code: ${currentFamily.inviteCode})` : ''
                }`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <span>WhatsApp Share</span>
            </a>
          </div>
        </Card>

        {/* ================= 7. User Profile Card & Sign Out ================= */}
        <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-slate-200 dark:border-slate-800 md:col-span-2">
          <div className="flex items-center gap-3.5">
            <div className="relative group cursor-pointer" onClick={() => setIsProfileModalOpen(true)}>
              <Avatar
                src={user?.avatar || user?.profileImage}
                name={user?.name || 'User'}
                size="md"
                className="ring-2 ring-indigo-500/30"
              />
              <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-indigo-600 text-white text-[9px] shadow-sm">
                <Camera className="w-2.5 h-2.5" />
              </span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {user?.name || 'User'}
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  {user?.roleInFamily || 'Member'}
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProfileModalOpen(true)}
              className="text-xs font-semibold"
            >
              Edit Profile & Photo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLogoutModalOpen(true)}
              icon={<LogOut className="w-4 h-4 text-rose-500" />}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/40 text-xs font-semibold"
            >
              {t.auth.logout}
            </Button>
          </div>
        </Card>
      </div>

      {/* ================= 8. Discreet Help & Support Subsection ================= */}
      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t.settings.helpAndSupport || 'Help & Support'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t.settings.helpAndSupportDesc || 'Instant AI troubleshooting, verified help articles, and technical support.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setHelpTab('support');
                setIsHelpModalOpen(true);
              }}
              icon={<Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
              className="text-xs font-semibold shrink-0"
            >
              AI Help & Support Center
            </Button>
          </div>
        </div>

        {/* Dedicated Admin Support Dashboard Card (for cxaali568@gmail.com / Family Admin) */}
        {(isFamilyAdmin || user?.email?.toLowerCase() === 'cxaali568@gmail.com') && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Admin Support Dashboard
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                    cxaali568@gmail.com
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Inspect family tickets, reply to members, monitor email notifications & AI summaries
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsAdminDashboardOpen(true)}
              icon={<Shield className="w-3.5 h-3.5" />}
              className="text-xs font-bold shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Open Admin Dashboard →
            </Button>
          </div>
        )}
      </div>

      {/* ================= 9. Privacy Policy & Legal (Very Bottom / End of Page) ================= */}
      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  {t.settings.privacyPolicy || 'Privacy Policy & Data Security'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {t.settings.privacyDesc || 'Your family records are isolated and protected under strict Firebase Security Rules.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setHelpTab('privacy');
                setIsHelpModalOpen(true);
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              View Full Policy →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
              <strong className="text-slate-700 dark:text-slate-300 block mb-0.5">🔒 Data Ownership</strong>
              All uploaded photos, notes, and records belong solely to your household.
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
              <strong className="text-slate-700 dark:text-slate-300 block mb-0.5">🛡️ Isolated Personal Space</strong>
              Personal budgets and notes are encrypted to your authenticated user account.
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
              <strong className="text-slate-700 dark:text-slate-300 block mb-0.5">⚡ AI Privacy Protection</strong>
              AI conversations are strictly private and never used to train public models.
            </div>
          </div>
        </div>
      </div>

      {/* ================= Logout Confirmation Modal ================= */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Sign Out of FamilyHub?"
        subtitle="You will be safely signed out from this browser session."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-start gap-2.5">
            <LogOut className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-200">
              You will need to sign in with your email and password again to access your family space.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLogoutModalOpen(false)}
            >
              Cancel (Stay Logged In)
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                setIsLogoutModalOpen(false);
                await logout();
              }}
              icon={<LogOut className="w-3.5 h-3.5" />}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================= Full AI Support & Help Center Modal ================= */}
      <Modal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        title="FamilyHub Help & Support Center"
        subtitle="AI Troubleshooting, Verified Documentation, and Member Support"
        maxWidth="xl"
      >
        <HelpSupportCenter
          initialTab={helpTab === 'faq' ? 'faq' : 'ai'}
          onOpenAdminDashboard={() => {
            setIsHelpModalOpen(false);
            setIsAdminDashboardOpen(true);
          }}
          isAdmin={isFamilyAdmin || user?.email?.toLowerCase() === 'cxaali568@gmail.com'}
        />
      </Modal>

      {/* ================= Admin Support Dashboard Modal ================= */}
      <Modal
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        title="FamilyHub Admin Support Dashboard"
        subtitle="Live ticket management, notifications dispatcher, and member inquiries"
        maxWidth="xl"
      >
        <AdminSupportDashboard onBackToApp={() => setIsAdminDashboardOpen(false)} />
      </Modal>


      {/* User Personal Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};
