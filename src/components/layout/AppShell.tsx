import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { usePersonal } from '../../context/PersonalContext';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { Avatar } from '../ui/Avatar';
import { NotificationDrawer } from '../notifications/NotificationDrawer';
import { OfflineBanner } from '../ui/OfflineBanner';
import { PWAInstallPrompt } from '../ui/PWAInstallPrompt';
import {
  MessageSquare,
  Users,
  GraduationCap,
  DollarSign,
  CreditCard,
  HeartPulse,
  Calendar,
  Image as ImageIcon,
  FileText,
  StickyNote,
  AlertTriangle,
  Bell,
  Lock,
  Settings,
  Menu,
  X,
  ChevronDown,
  Plus,
  Home,
  LogOut,
  Check,
  Sparkles,
} from 'lucide-react';
import { FamilyNavRoute } from '../../types';
import { UserProfileModal } from '../profile/UserProfileModal';
import { Chat3D, Family3D, Expenses3D, PersonalSpace3D } from '../ui/Icons3D';

interface AppShellProps {
  children: React.ReactNode;
  onOpenOnboarding?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, onOpenOnboarding }) => {
  const { user, logout } = useAuth();
  const {
    currentFamily,
    userFamilies,
    switchFamily,
    currentRoute,
    setCurrentRoute,
    urgentItems,
  } = useFamily();
  const { unreadCount, setIsOpen: setNotificationOpen } = useNotifications();
  const { t } = useLanguage();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [familyDropdownOpen, setFamilyDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Exact navigation order specified in Step 10:
  // 1. Chat (MUST remain FIRST)
  // 2. Members
  // 3. Children
  // 4. Medical & Care
  // 5. Expenses
  // 6. Bills
  // 7. Notes
  // 8. Planner
  // 9. Photos
  // 10. Documents
  // 11. Urgent
  // 12. Notifications
  // 13. My Personal
  // 14. Settings
  const navItems: {
    id: FamilyNavRoute;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    isPersonal?: boolean;
    isUrgent?: boolean;
  }[] = [
    { id: 'chat', label: t.nav.chat, icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'family', label: t.nav.family, icon: <Users className="w-4 h-4" /> },
    { id: 'children', label: 'Children', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'medical', label: t.nav.medical, icon: <HeartPulse className="w-4 h-4" /> },
    { id: 'expenses', label: t.nav.expenses || t.nav.money, icon: <DollarSign className="w-4 h-4" /> },
    { id: 'bills', label: 'Bills', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'notes', label: t.nav.notes, icon: <StickyNote className="w-4 h-4" /> },
    { id: 'planner', label: 'Planner', icon: <Calendar className="w-4 h-4" /> },
    { id: 'photos', label: t.nav.photos, icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'documents', label: t.nav.documents, icon: <FileText className="w-4 h-4" /> },
    {
      id: 'urgent',
      label: t.nav.urgent,
      icon: <AlertTriangle className="w-4 h-4 text-rose-500" />,
      badge: urgentItems.length > 0 ? urgentItems.length : undefined,
      isUrgent: true,
    },
    {
      id: 'notifications',
      label: t.nav.notifications,
      icon: <Bell className="w-4 h-4" />,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'ai',
      label: 'Family AI',
      icon: <Sparkles className="w-4 h-4 text-indigo-500" />,
    },
    {
      id: 'personal',
      label: t.nav.myPersonal,
      icon: <Lock className="w-4 h-4" />,
      isPersonal: true,
    },
    { id: 'settings', label: t.nav.settings, icon: <Settings className="w-4 h-4" /> },
  ];

  const handleNavClick = (id: FamilyNavRoute) => {
    if (id === 'notifications') {
      setNotificationOpen(true);
    } else {
      setCurrentRoute(id);
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans">
      {/* Network Connection Status */}
      <OfflineBanner />

      <div className="flex flex-1 overflow-hidden relative">
        {/* ---------------- Desktop Sidebar ---------------- */}
        {/* ---------------- Desktop Sidebar ---------------- */}
        <aside className="hidden lg:flex flex-col w-68 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800/90 shrink-0 z-20">
          {/* Brand Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-sm shadow-indigo-600/30">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                  FamilyHub
                </h1>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                  Connected Home
                </p>
              </div>
            </div>
            <PWAInstallPrompt variant="button" className="text-[11px] py-1 px-2" />
          </div>

          {/* Family Switcher Header */}
          <div className="relative px-4 py-3 border-b border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => setFamilyDropdownOpen(!familyDropdownOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left group border border-slate-200/70 dark:border-slate-800"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Avatar
                  src={currentFamily?.photo || currentFamily?.avatar}
                  name={currentFamily?.name || 'Family'}
                  size="md"
                  className="ring-2 ring-indigo-500/20 shrink-0"
                />
                <div className="overflow-hidden">
                  <h2 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 transition-colors">
                    {currentFamily?.name || 'My Family'}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
                    <Home className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span>Switch Family</span>
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 transition-transform" />
            </button>

            {/* Family Switcher Dropdown */}
            {familyDropdownOpen && (
              <div className="absolute top-16 left-3 right-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 z-30 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Your Families ({userFamilies.length})
                </p>
                {userFamilies.map(f => (
                  <button
                    key={f.family.id}
                    onClick={() => {
                      switchFamily(f.family.id);
                      setFamilyDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                      f.family.id === currentFamily?.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 font-bold text-indigo-700 dark:text-indigo-300'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Avatar src={f.family.photo || f.family.avatar} name={f.family.name} size="xs" />
                      <span className="truncate">{f.family.name}</span>
                    </div>
                    {f.family.id === currentFamily?.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                ))}

                <div className="pt-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => {
                      setFamilyDropdownOpen(false);
                      if (onOpenOnboarding) onOpenOnboarding();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Join or Create Family</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation List in exact order */}
          <nav className="flex-1 overflow-y-auto px-3 py-2.5 space-y-1 touch-scroll">
            {navItems.map(item => {
              const isActive =
                currentRoute === item.id ||
                (item.id === 'expenses' && currentRoute === 'money') ||
                (item.id === 'money' && currentRoute === 'expenses');
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none ${
                    item.isPersonal
                      ? isActive
                        ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-sm'
                        : 'bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40'
                      : isActive
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-white' : item.isPersonal ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono tabular-nums font-bold px-1.5 py-0.5 rounded-full ${
                        item.isUrgent
                          ? 'bg-rose-500 text-white animate-pulse'
                          : isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile & Sign Out Footer */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between">
            <button
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-2.5 overflow-hidden text-left hover:opacity-85 transition-opacity cursor-pointer group flex-1"
              title="Edit Profile & Photo"
            >
              <div className="relative">
                <Avatar src={user?.avatar || user?.profileImage} name={user?.name || 'User'} size="sm" status="online" />
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[8px] shadow-sm">
                  ✎
                </span>
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 transition-colors">
                  {user?.name || 'User'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
            </button>
            <button
              onClick={logout}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* ---------------- Mobile Top Bar ---------------- */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="lg:hidden flex items-center justify-between px-3.5 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-20 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                onClick={() => setProfileModalOpen(true)}
                className="flex items-center gap-2 cursor-pointer group text-left hover:opacity-90 transition-opacity"
                title="Edit My Profile & Photo"
              >
                <div className="relative shrink-0">
                  <Avatar
                    src={user?.avatar || user?.profileImage}
                    name={user?.name || 'User'}
                    size="sm"
                    className="ring-2 ring-indigo-500/20"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[7px] font-bold shadow-xs">
                    ✎
                  </span>
                </div>
                <div>
                  <h1 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[130px] group-hover:text-indigo-600 transition-colors">
                    {currentFamily?.name || 'FamilyHub'}
                  </h1>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                    <span>Family Space</span>
                    <span className="text-[9px] text-slate-400 font-normal">• Edit</span>
                  </p>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <PWAInstallPrompt variant="button" className="text-[11px] py-1 px-2" />
              <button
                onClick={() => setNotificationOpen(true)}
                className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
              <button
                onClick={() => setProfileModalOpen(true)}
                className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:ring-2 hover:ring-indigo-500/50 transition-all cursor-pointer"
                title="Edit Profile & Photo"
                aria-label="Your Profile"
              >
                <Avatar src={user?.avatar || user?.profileImage} name={user?.name || 'User'} size="sm" />
                <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[8px] font-bold ring-1 ring-white dark:ring-slate-900">
                  ✎
                </span>
              </button>
            </div>
          </header>

          {/* ---------------- Main Content View ---------------- */}
          {/* Enables native fluid scrolling on mobile with touch momentum and bottom padding */}
          <main className={`flex-1 relative min-h-0 ${currentRoute === 'chat' ? 'overflow-hidden' : 'overflow-y-auto touch-scroll overscroll-contain'}`}>
            <div className={`w-full min-h-full ${currentRoute === 'chat' ? 'h-full' : 'pb-24 lg:pb-10'}`}>
              {children}
            </div>
          </main>

          {/* ---------------- Mobile Bottom Navigation ---------------- */}
          {/* Tactile 3D Dock: Chat is thumb-anchored on the left */}
          <nav className="lg:hidden flex items-center justify-around bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-2 py-1.5 pb-safe z-20 shrink-0 shadow-lg shadow-slate-900/5">
            <button
              onClick={() => setCurrentRoute('chat')}
              className={`flex-1 min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
                currentRoute === 'chat'
                  ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50/70 dark:bg-indigo-950/50 shadow-inner'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Chat3D className="w-5 h-5 mb-0.5" />
              <span>{t.nav.chat}</span>
            </button>

            <button
              onClick={() => setCurrentRoute('family')}
              className={`flex-1 min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
                currentRoute === 'family'
                  ? 'text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50/70 dark:bg-emerald-950/50 shadow-inner'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Family3D className="w-5 h-5 mb-0.5" />
              <span>{t.nav.family}</span>
            </button>

            <button
              onClick={() => setCurrentRoute('expenses')}
              className={`flex-1 min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
                currentRoute === 'expenses' || currentRoute === 'money'
                  ? 'text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50/70 dark:bg-emerald-950/50 shadow-inner'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Expenses3D className="w-5 h-5 mb-0.5" />
              <span>{t.nav.expenses || t.nav.money}</span>
            </button>

            <button
              onClick={() => setCurrentRoute('personal')}
              className={`flex-1 min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
                currentRoute === 'personal'
                  ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50/70 dark:bg-indigo-950/50 shadow-inner'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              <PersonalSpace3D className="w-5 h-5 mb-0.5" />
              <span>Private</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex-1 min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 transition-all active:scale-95 cursor-pointer"
            >
              <Menu className="w-5 h-5 mb-0.5" />
              <span>More</span>
            </button>
          </nav>
        </div>
      </div>

      {/* ---------------- Mobile Full Drawer Menu ---------------- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative w-4/5 max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar src={currentFamily?.photo || currentFamily?.avatar} name={currentFamily?.name || 'Family'} size="sm" />
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm truncate">
                  {currentFamily?.name || 'FamilyHub'}
                </h3>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Logged-in User's Own Profile Card at Top of Menu */}
            <div className="p-3 bg-gradient-to-r from-indigo-50/90 to-purple-50/50 dark:from-slate-800/80 dark:to-indigo-950/40 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setProfileModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 shadow-xs hover:border-indigo-500 transition-all text-left cursor-pointer group"
                title="Edit My Profile & Photo"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="relative shrink-0">
                    <Avatar
                      src={user?.avatar || user?.profileImage}
                      name={user?.name || 'User'}
                      size="md"
                      status="online"
                      className="ring-2 ring-indigo-500/20"
                    />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] shadow-sm font-bold">
                      ✎
                    </span>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 transition-colors">
                      {user?.name || 'My Profile'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {user?.email}
                    </p>
                    <span className="inline-block mt-0.5 text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                      Edit Profile & Photo →
                    </span>
                  </div>
                </div>
              </button>
            </div>

            {/* Mobile Family Switcher & Management */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 space-y-2">
              {userFamilies.length > 1 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Switch Family:</p>
                  <div className="space-y-1">
                    {userFamilies.map(f => (
                      <button
                        key={f.family.id}
                        onClick={() => {
                          switchFamily(f.family.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                          f.family.id === currentFamily?.id
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{f.family.name}</span>
                        {f.family.id === currentFamily?.id && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {onOpenOnboarding && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenOnboarding();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Join or Create Family</span>
                </button>
              )}
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map(item => {
                const isActive =
                  currentRoute === item.id ||
                  (item.id === 'expenses' && currentRoute === 'money') ||
                  (item.id === 'money' && currentRoute === 'expenses');
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : item.isPersonal
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-500 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Logged-in User's Own Profile in Mobile Menu */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setProfileModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors border border-slate-200/60 dark:border-slate-700 text-left group cursor-pointer"
                title="Edit My Profile & Photo"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="relative shrink-0">
                    <Avatar
                      src={user?.avatar || user?.profileImage}
                      name={user?.name || 'User'}
                      size="sm"
                      status="online"
                    />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[8px] shadow-sm">
                      ✎
                    </span>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 transition-colors">
                      {user?.name || 'My Profile'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60">
                  Edit Profile
                </span>
              </button>
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
              <PWAInstallPrompt variant="menu-item" />
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <button
                onClick={logout}
                className="w-full py-2.5 text-xs font-semibold text-rose-600 flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.auth.logout}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Drawer */}
      <NotificationDrawer />

      {/* User Personal Profile & Avatar Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
};
