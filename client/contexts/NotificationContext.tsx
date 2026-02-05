import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type NotificationTone = 'info' | 'success' | 'warn' | 'error';

export interface AppNotification {
  id: string;
  message: string;
  time: number;
  tone: NotificationTone;
  read: boolean;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (message: string, tone?: NotificationTone) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);
const STORAGE_KEY = 'AUTOUSATA:notifications';
const MAX_NOTIFICATIONS = 50;

const readStored = (): AppNotification[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => readStored());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((message: string, tone: NotificationTone = 'info') => {
    setNotifications(prev => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        message,
        time: Date.now(),
        tone,
        read: false,
      },
      ...prev,
    ].slice(0, MAX_NOTIFICATIONS));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(item => ({ ...item, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter(item => !item.read).length,
    [notifications]
  );

  const value = useMemo(
    () => ({ notifications, unreadCount, addNotification, markAllRead, clearNotifications }),
    [notifications, unreadCount, addNotification, markAllRead, clearNotifications]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
};
