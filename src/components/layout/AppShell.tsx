import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { usePersonal } from '../../context/PersonalContext';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { Avatar } from '../ui/Avatar';
import { NotificationDrawer } from '../notifications/NotificationDrawer';
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans">
      {/* ---------------- Desktop Sidebar ---------------- */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 z-20">
        {/* Family Switcher Header */}
        <div className="relative p-3.5 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setFamilyDropdownOpen(!familyDropdownOpen)}
            className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors text-left group"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <Avatar
                src={currentFamily?.photo || currentFamily?.avatar}
                name={currentFamily?.name || 'Family'}
                size="md"
                className="ring-2 ring-indigo-500/20 shrink-0"
              />
              <div className="overflow-hidden">
                <div className="flex items-center gap-1">
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 transition-colors">
                    {currentFamily?.name || 'My Family'}
                  </h2>
                </div>
                <p className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
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
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
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
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Join or Create Family</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation List in exact 1-12 order */}
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  item.isPersonal
                    ? isActive
                      ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-sm'
                      : 'bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40'
                    : isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : item.isPersonal ? 'text-indigo-600 dark:text-indigo-400' : ''}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      item.isUrgent
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
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
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Avatar src={user?.avatar || user?.profileImage} name={user?.name || 'User'} size="sm" status="online" />
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {user?.name}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ---------------- Mobile Top Bar ---------------- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="lg:hidden flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-20 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Avatar src={currentFamily?.photo || currentFamily?.avatar} name={currentFamily?.name || 'Family'} size="sm" />
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[150px]">
                  {currentFamily?.name || 'FamilyHub'}
                </h1>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                  Family Space
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setNotificationOpen(true)}
              className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>
            <Avatar src={user?.avatar || user?.profileImage} name={user?.name || 'User'} size="sm" />
          </div>
        </header>

        {/* ---------------- Main Content View ---------------- */}
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>

        {/* ---------------- Mobile Bottom Navigation ---------------- */}
        {/* Chat-first principle: Chat is permanently on the left thumb reach */}
        <nav className="lg:hidden flex items-center justify-around bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-2 py-1.5 z-20 shrink-0">
          <button
            onClick={() => setCurrentRoute('chat')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
              currentRoute === 'chat'
                ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span>{t.nav.chat}</span>
          </button>

          <button
            onClick={() => setCurrentRoute('family')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
              currentRoute === 'family'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>{t.nav.family}</span>
          </button>

          <button
            onClick={() => setCurrentRoute('expenses')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
              currentRoute === 'expenses' || currentRoute === 'money'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="w-5 h-5 mb-0.5" />
            <span>{t.nav.expenses || t.nav.money}</span>
          </button>

          <button
            onClick={() => setCurrentRoute('personal')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
              currentRoute === 'personal'
                ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <Lock className="w-5 h-5 mb-0.5 text-indigo-500" />
            <span>Private</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span>More</span>
          </button>
        </nav>
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
                className="p-1 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Family Switcher */}
            {userFamilies.length > 1 && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Switch Family:</p>
                <div className="space-y-1">
                  {userFamilies.map(f => (
                    <button
                      key={f.family.id}
                      onClick={() => {
                        switchFamily(f.family.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-xs ${
                        f.family.id === currentFamily?.id
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{f.family.name}</span>
                      {f.family.id === currentFamily?.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
    </div>
  );
};
