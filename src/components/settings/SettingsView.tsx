import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { PWAInstallPrompt } from '../ui/PWAInstallPrompt';
import { submitSupportTicket } from '../../services/supportService';

export const SettingsView: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const {
    currentFamily,
    familyRole,
    updateFamilyIdentity,
    uploadFamilyLogo,
  } = useFamily();
  const { profile, enableLock, disableLock } = usePersonal();

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
  const [helpTab, setHelpTab] = useState<'support' | 'privacy' | 'faq'>('support');

  // Support Ticket Form State
  const [ticketCategory, setTicketCategory] = useState<'bug' | 'complaint' | 'help' | 'feature'>('help');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState<{ referenceId: string } | null>(null);

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
      console.error('Failed to submit ticket:', err);
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

        {/* ================= 2. Language & Internationalization ================= */}
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

        {/* ================= 3. Appearance Theme ================= */}
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

        {/* ================= 6. Privacy Policy, Help & Support ================= */}
        <Card className="space-y-4 md:col-span-2 border-indigo-200/50 dark:border-indigo-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  Privacy Policy, Help & Support Tickets
                </h3>
                <p className="text-xs text-slate-400">
                  Family data privacy guarantees, bug reports, complaints, and ticket assistance.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHelpModalOpen(true)}
              icon={<HelpCircle className="w-4 h-4 text-indigo-600" />}
              className="text-xs font-bold"
            >
              Open Support & Privacy Center
            </Button>
          </div>
        </Card>
      </div>

      {/* ================= 7. Install Mobile Web App (PWA) ================= */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Install Mobile App (PWA)
            </h3>
            <p className="text-xs text-slate-400">
              Install FamilyHub to your Android or iPhone Home Screen for fast, standalone access.
            </p>
          </div>
        </div>
        <PWAInstallPrompt variant="banner" />
      </Card>

      {/* ================= 8. User Profile Card & Sign Out ================= */}
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-slate-200 dark:border-slate-800">
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

      {/* ================= Privacy Policy & Support Center Modal ================= */}
      <Modal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        title="Privacy Policy, Help & Support"
        subtitle="Submit tickets, review privacy terms, and access help documentation."
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 pb-2 gap-2">
            <button
              onClick={() => setHelpTab('support')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                helpTab === 'support'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Submit Ticket / Complaint
            </button>
            <button
              onClick={() => setHelpTab('privacy')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                helpTab === 'privacy'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setHelpTab('faq')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                helpTab === 'faq'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              FAQ & Help
            </button>
          </div>

          {/* Tab 1: Submit Support Ticket */}
          {helpTab === 'support' && (
            <div className="space-y-4">
              {ticketResult ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                    <Check className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-100">
                    Ticket Submitted Successfully!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Your reference number is:{' '}
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                      {ticketResult.referenceId}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Our team and system have recorded your request in the FamilyHub support registry.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTicketResult(null)}
                    className="mt-2 text-xs"
                  >
                    Submit Another Ticket
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmitTicket} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Issue Category
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'bug', label: 'Bug Report' },
                        { id: 'complaint', label: 'Complaint' },
                        { id: 'help', label: 'Help / Question' },
                        { id: 'feature', label: 'Feature Request' },
                      ].map(cat => (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => setTicketCategory(cat.id as any)}
                          className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center ${
                            ticketCategory === cat.id
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Subject
                    </label>
                    <Input
                      value={ticketSubject}
                      onChange={e => setTicketSubject(e.target.value)}
                      placeholder="Brief summary of your question or issue"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Detailed Message
                    </label>
                    <textarea
                      value={ticketMessage}
                      onChange={e => setTicketMessage(e.target.value)}
                      placeholder="Please describe what happened, steps to reproduce, or what you need help with..."
                      required
                      rows={4}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={ticketSubmitting}
                      icon={<Send className="w-3.5 h-3.5" />}
                    >
                      Submit Support Ticket
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Tab 2: Privacy Policy */}
          {helpTab === 'privacy' && (
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-[50vh] overflow-y-auto pr-1">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/60 dark:border-indigo-900/40">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-200 text-xs">
                  FamilyHub Privacy Commitment
                </h4>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                  Your family data is private, isolated, and strictly protected under Google Firebase Security Rules.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-800 dark:text-slate-100">1. Data Ownership & Scope</h5>
                <p>
                  All photos, messages, expense receipts, medical logs, and notes uploaded to FamilyHub belong entirely to your household. We never sell, advertise, or share your family records with third parties.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-800 dark:text-slate-100">2. Personal Space Isolation</h5>
                <p>
                  Notes and budgets created inside your Personal Space are locked to your individual authenticated user ID with optional PIN protection. Other family members cannot view or search your private vault.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-800 dark:text-slate-100">3. Artificial Intelligence Privacy</h5>
                <p>
                  AI queries sent to the FamilyHub AI Board are processed exclusively for answering your family questions and assistance. Private family conversations are not used for public model training.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-800 dark:text-slate-100">4. Account Deletion & Right to be Forgotten</h5>
                <p>
                  You may request complete removal of your profile and data by submitting a ticket in the Support tab.
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: FAQ */}
          {helpTab === 'faq' && (
            <div className="space-y-3 text-xs max-h-[50vh] overflow-y-auto pr-1">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <h5 className="font-bold text-slate-800 dark:text-slate-200">
                  How do I invite members to Khan House?
                </h5>
                <p className="text-slate-500">
                  Share the Family Invite Code from Settings with your spouse or children. When they log in, they can enter the code to join your shared family space.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <h5 className="font-bold text-slate-800 dark:text-slate-200">
                  How does the AI Board work?
                </h5>
                <p className="text-slate-500">
                  Click 'AI Board' in the navigation menu to ask questions about meal planning, schedule advice, parenting tips, or household organization.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <h5 className="font-bold text-slate-800 dark:text-slate-200">
                  Can I send voice notes in Family Chat?
                </h5>
                <p className="text-slate-500">
                  Yes! Tap the microphone icon in the chat composer to record a voice message, then tap send to post it for your family to listen to.
                </p>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* User Personal Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};
