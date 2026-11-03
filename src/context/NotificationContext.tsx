import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppNotification } from '../types';
import { notificationService } from '../services/notificationService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  mobilePushEnabled: boolean;
  toggleMobilePush: (enabled?: boolean) => Promise<{ success: boolean; state: boolean; permission: string }>;
  sendTestNotification: () => Promise<boolean>;
  permissionStatus: NotificationPermission | 'unsupported';
  requestWebNotificationPermission?: () => Promise<any>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Robust device push notification dispatcher (ServiceWorker + Window Notification + Audio chime)
export const triggerDeviceNotification = async (title: string, body: string): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  let delivered = false;

  // 1. Service Worker showNotification (Mandatory for Android Chrome & background PWA)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/icon.svg',
          tag: 'familyhub-device-alert',
        } as any);
        delivered = true;
      }
    } catch (e) {
      console.warn('ServiceWorker showNotification fallback:', e);
    }
  }

  // 2. Desktop Window Notification fallback
  if (!delivered && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
      });
      delivered = true;
    } catch (e) {
      console.warn('Window Notification fallback:', e);
    }
  }

  // 3. Audio feedback chime so user always receives clear sensory confirmation
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {}

  return delivered;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || '';

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const prevUnreadRef = useRef<number>(0);

  // Optional mobile & device push notifications toggle
  const [mobilePushEnabled, setMobilePushEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('familyhub_push_notifs');
      if (saved !== null) return saved === 'true';
      return false;
    } catch {
      return false;
    }
  });

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const toggleMobilePush = async (explicitState?: boolean): Promise<{ success: boolean; state: boolean; permission: string }> => {
    const targetState = explicitState !== undefined ? explicitState : !mobilePushEnabled;

    if (!targetState) {
      setMobilePushEnabledState(false);
      try {
        localStorage.setItem('familyhub_push_notifs', 'false');
      } catch {}
      return { success: true, state: false, permission: permissionStatus };
    }

    // User wants to turn ON
    let perm = permissionStatus;
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission !== 'granted') {
          perm = await Notification.requestPermission();
          setPermissionStatus(Notification.permission);
        } else {
          perm = 'granted';
          setPermissionStatus('granted');
        }
      } catch (err) {
        console.warn('Notification permission request error:', err);
      }
    }

    // Save user's preference to enable push alerts
    setMobilePushEnabledState(true);
    try {
      localStorage.setItem('familyhub_push_notifs', 'true');
    } catch {}

    // Send confirmation alert
    triggerDeviceNotification(
      'FamilyHub Alerts Enabled',
      'Device push alerts are now active for your family space.'
    );

    return {
      success: true,
      state: true,
      permission: perm,
    };
  };

  const sendTestNotification = async (): Promise<boolean> => {
    return triggerDeviceNotification(
      '🔔 FamilyHub Test Alert',
      'Your device alerts and notifications are working properly!'
    );
  };

  const requestWebNotificationPermission = async (): Promise<any> => {
    return toggleMobilePush(true);
  };

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const unsub = notificationService.subscribeUserNotifications(userId, (notifs) => {
      setNotifications(notifs);
      const unread = notifs.filter((n) => !n.readAt);
      setUnreadCount(unread.length);

      // Trigger browser/device push notification ONLY IF user enabled the optional toggle
      if (unread.length > prevUnreadRef.current && mobilePushEnabled) {
        const latest = unread[0];
        if (latest) {
          triggerDeviceNotification(latest.title || 'FamilyHub Alert', latest.message);
        }
      }
      prevUnreadRef.current = unread.length;
    });

    return () => unsub();
  }, [userId, mobilePushEnabled]);

  const markAsRead = async (id: string) => {
    // Optimistic mark
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
      setUnreadCount(updated.filter((n) => !n.readAt).length);
      return updated;
    });
    await notificationService.markAsRead(id);
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    setUnreadCount(0);
    await notificationService.markAllAsRead(userId);
  };

  const deleteNotification = async (id: string) => {
    // Optimistic deletion
    setNotifications((prev) => {
      const filtered = prev.filter((n) => n.id !== id);
      setUnreadCount(filtered.filter((n) => !n.readAt).length);
      return filtered;
    });
    await notificationService.deleteNotification(id);
  };

  const clearAllNotifications = async () => {
    if (!userId) return;
    setNotifications([]);
    setUnreadCount(0);
    await notificationService.clearAllNotifications(userId);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isOpen,
        setIsOpen,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        mobilePushEnabled,
        toggleMobilePush,
        sendTestNotification,
        permissionStatus,
        requestWebNotificationPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
