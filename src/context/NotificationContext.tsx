import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppNotification } from '../types';
import { notificationService } from '../services/notificationService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || '';

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const refresh = () => {
      setNotifications(notificationService.getNotifications(userId));
      setUnreadCount(notificationService.getUnreadCount(userId));
    };

    refresh();
    const unsub = notificationService.subscribe(() => {
      refresh();
    });

    return () => unsub();
  }, [userId]);

  const markAsRead = (id: string) => {
    notificationService.markAsRead(id);
    if (userId) {
      setNotifications(notificationService.getNotifications(userId));
      setUnreadCount(notificationService.getUnreadCount(userId));
    }
  };

  const markAllAsRead = () => {
    if (!userId) return;
    notificationService.markAllAsRead(userId);
    setNotifications(notificationService.getNotifications(userId));
    setUnreadCount(0);
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
