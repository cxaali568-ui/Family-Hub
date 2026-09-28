import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useFamily } from '../../context/FamilyContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Bell, Check, Clock, MessageSquare, AlertTriangle, DollarSign, Activity, X } from 'lucide-react';
import { NotificationType } from '../../types';

export const NotificationDrawer: React.FC = () => {
  const { notifications, unreadCount, isOpen, setIsOpen, markAsRead, markAllAsRead } = useNotifications();
  const { activityLogs } = useFamily();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'notifications' | 'activity'>('notifications');

  if (!isOpen) return null;

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'new_message': return <MessageSquare className="w-4 h-4 text-indigo-500" />;
      case 'urgent_item': return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'bill_due':
      case 'expense_added': return <DollarSign className="w-4 h-4 text-emerald-500" />;
      default: return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t.nav.notifications}
              </h2>
              <p className="text-xs text-slate-400">
                {unreadCount > 0 ? `${unreadCount} unread notices` : 'All caught up'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs & Mark All Read */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`text-xs font-bold pb-2 border-b-2 cursor-pointer transition-colors ${
                activeTab === 'notifications'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Alerts ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`text-xs font-bold pb-2 border-b-2 cursor-pointer transition-colors ${
                activeTab === 'activity'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Activity Feed ({activityLogs.length})
            </button>
          </div>

          {activeTab === 'notifications' && unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {t.common.markAllRead}
            </button>
          )}
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {activeTab === 'notifications' ? (
            notifications.length === 0 ? (
              <EmptyState
                icon={<Bell className="w-7 h-7" />}
                title="No notifications"
                description="When family members add bills, messages, or medical updates, you'll be notified here."
              />
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    !n.readAt
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 shadow-2xs'
                      : 'bg-white dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-2xs shrink-0 mt-0.5">
                      {getTypeIcon(n.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {n.title}
                        </h4>
                        {!n.readAt && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            <div className="space-y-3">
              {activityLogs.map(log => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 shrink-0 mt-0.5">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-slate-800 dark:text-slate-200">
                      <strong>{log.actorName}</strong> {log.action}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
