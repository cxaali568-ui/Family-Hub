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
  DollarSign,
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
  ChevronRight,
  Shield,
  LogOut,
} from 'lucide-react';
import { FamilyNavRoute } from '../../types';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user, switchUser, demoUsers, logout } = useAuth();
  const { family, currentRoute, setCurrentRoute, urgentItems } = useFamily();
  const { isLocked } = usePersonal();
  const { unreadCount, setIsOpen: setNotificationOpen } = useNotifications();
  const { t, isRtl } = useLanguage();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Exact navigation order specified in requirements:
  // 1. Chat, 2. Family, 3. Money, 4. Medical, 5. Plans, 6. Photos, 7. Documents, 8. Notes, 9. Urgent, 10. Notifications, 11. My Personal, 12. Settings
  const navItems: { id: FamilyNavRoute; label: string; icon: React.ReactNode; badge?: number | string; isPersonal?: boolean; isUrgent?: boolean }[] = [
    { id: 'chat', label: t.nav.chat, icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'family', label: t.nav.family, icon: <Users className="w-4 h-4" /> },
    { id: 'money', label: t.nav.money, icon: <DollarSign className="w-4 h-4" /> },
    { id: 'medical', label: t.nav.medical, icon: <HeartPulse className="w-4 h-4" /> },
    { id: 'plans', label: t.nav.plans, icon: <Calendar className="w-4 h-4" /> },
    { id: 'photos', label: t.nav.photos, icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'documents', label: t.nav.documents, icon: <FileText className="w-4 h-4" /> },
    { id: 'notes', label: t.nav.notes, icon: <StickyNote className="w-4 h-4" /> },
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
        {/* Family Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <Avatar
              src={family.avatar}
              name={family.name}
              size="md"
              status="online"
              className="ring-2 ring-indigo-500/20 shrink-0"
            />
            <div className="overflow-hidden">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                {family.name}
              </h2>
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded">
                FamilyHub
              </span>
            </div>
          </div>

          <button
            onClick={() => setNotificationOpen(true)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>
        </div>

        {/* Navigation List in exact 1-12 order */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(item => {
            const isActive = currentRoute === item.id;
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

        {/* User Switcher / Profile Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Avatar src={user?.avatar} name={user?.name || 'User'} size="sm" status={user?.status} />
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {user?.name}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize">
                    {user?.roleInFamily} • Switch
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Switcher Dropdown */}
            {userDropdownOpen && (
              <div className="absolute bottom-14 left-0 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 z-30 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Switch Demo Member
                </p>
                {demoUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      switchUser(u.id);
                      setUserDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs transition-colors ${
                      u.id === user?.id
                        ? 'bg-indigo-50 dark:bg-indigo-950 font-bold text-indigo-700 dark:text-indigo-300'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Avatar src={u.avatar} name={u.name} size="xs" />
                    <span className="truncate">{u.name}</span>
                  </button>
                ))}
                <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-left text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.auth.logout}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
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
              <Avatar src={family.avatar} name={family.name} size="sm" />
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {family.name}
                </h1>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                  FamilyHub
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
            <Avatar src={user?.avatar} name={user?.name || 'User'} size="sm" />
          </div>
        </header>

        {/* ---------------- Main Content View ---------------- */}
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>

        {/* ---------------- Mobile Bottom Navigation ---------------- */}
        {/* Keeps Chat first and easily accessible */}
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
            onClick={() => setCurrentRoute('money')}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
              currentRoute === 'money'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="w-5 h-5 mb-0.5" />
            <span>{t.nav.money}</span>
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
                <Avatar src={family.avatar} name={family.name} size="sm" />
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                  {family.name}
                </h3>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentRoute === item.id
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
              ))}
            </nav>

            {/* Mobile User Profile & Switcher */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase">Switch Member:</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {demoUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      switchUser(u.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-1.5 p-1.5 rounded-lg text-[11px] truncate ${
                      u.id === user?.id
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Avatar src={u.avatar} name={u.name} size="xs" />
                    <span className="truncate">{u.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={logout}
                className="w-full py-2 text-xs font-semibold text-rose-600 flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40"
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
