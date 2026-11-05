import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useFamily } from '../../context/FamilyContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { Bell, Check, Clock, MessageSquare, AlertTriangle, DollarSign, Activity, X, Trash2 } from 'lucide-react';
import { NotificationType } from '../../types';

export const NotificationDrawer: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();
  const { activityLogs, deleteActivityLog, clearAllActivityLogs } = useFamily();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'notifications' | 'activity'>('notifications');
  const [showClearConfirm, setShowClearConfirm] = useState<'notifications' | 'activity' | null>(null);
  const [clearing, setClearing] = useState(false);

  if (!isOpen) return null;

  const handleConfirmClearAll = async () => {
    setClearing(true);
    try {
      if (showClearConfirm === 'activity') {
        await clearAllActivityLogs();
      } else {
        await clearAllNotifications();
      }
      setShowClearConfirm(null);
    } finally {
      setClearing(false);
    }
  };

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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs & Actions */}
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

          {activeTab === 'notifications' && notifications.length > 0 && (
            <div className="flex items-center gap-2 pb-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {t.common.markAllRead}
                </button>
              )}
              <button
                onClick={() => setShowClearConfirm('notifications')}
                className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
              >
                Clear All
              </button>
            </div>
          )}

          {activeTab === 'activity' && activityLogs.length > 0 && (
            <div className="flex items-center gap-2 pb-1.5">
              <button
                onClick={() => setShowClearConfirm('activity')}
                className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
              >
                Clear Feed
              </button>
            </div>
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
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    !n.readAt
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 shadow-2xs'
                      : 'bg-white dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      onClick={() => markAsRead(n.id)}
                      className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-2xs shrink-0 mt-0.5 cursor-pointer"
                    >
                      {getTypeIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0" onClick={() => markAsRead(n.id)}>
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {n.title}
                        </h4>
                        {!n.readAt && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 break-words">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                      title="Dismiss notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )
          ) : activityLogs.length === 0 ? (
            <EmptyState
              icon={<Activity className="w-7 h-7" />}
              title="No activity recorded"
              description="Recent member updates, bill additions, and family actions will appear here."
            />
          ) : (
            <div className="space-y-2.5">
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs group"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-800 dark:text-slate-200 leading-snug break-words">
                        <strong>{log.actorName}</strong> {log.action}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(log.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteActivityLog(log.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer shrink-0"
                    title="Delete activity record"
                    aria-label="Delete activity item"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={Boolean(showClearConfirm)}
        onClose={() => setShowClearConfirm(null)}
        title={showClearConfirm === 'activity' ? "Clear Activity Feed?" : "Clear All Notifications?"}
        subtitle={
          showClearConfirm === 'activity'
            ? "This will clear all recorded activity logs for your family space."
            : "This will permanently clear your notification alerts history."
        }
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
            <strong>Note:</strong> Your family chat messages, bills, and medical records will remain completely intact.
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirm(null)}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={clearing}
              onClick={handleConfirmClearAll}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Clear All
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
