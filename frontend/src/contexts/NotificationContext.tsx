import * as React from 'react';
import { io } from 'socket.io-client';
import { apiClient } from '../api/index';

const { createContext, useContext, useEffect, useState, useCallback } = React;
type ReactNode = React.ReactNode;

const SOCKET_URL = import.meta.env.VITE_WS_URL ?? (import.meta.env.DEV
  ? 'http://localhost:3000'
  : window.location.origin);

export type NotifType = 'stock_alert' | 'proposition' | 'commande' | 'info';

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: Record<string, unknown>;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
  connected: boolean;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));

  useEffect(() => {
    const handleStorage = () => {
      const currentToken = localStorage.getItem('access_token');
      setToken(currentToken);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('auth_update', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('auth_update', handleStorage);
    };
  }, []);

  // HTTP polling for notifications (works on all platforms including Vercel)
  useEffect(() => {
    if (!token) {
      setConnected(false);
      return;
    }

    let active = true;

    const poll = async () => {
      try {
        const res = await apiClient.get('/notifications', { params: { limit: '50' } });
        if (!active) return;
        const data: any[] = res.data;
        const mapped: Notification[] = data.map((n: any) => ({
          id: n.id,
          type: n.type as NotifType,
          title: n.title,
          message: n.message,
          timestamp: n.timestamp ?? n.createdAt,
          read: n.read ?? false,
          data: n.data ?? undefined,
        }));
        setNotifications(mapped);
        setConnected(true);
      } catch {
        if (active) setConnected(false);
      }
    };

    void poll();

    const interval = setInterval(poll, 30000);

    return () => {
      active = false;
      clearInterval(interval);
      setConnected(false);
    };
  }, [token]);

  // Socket.io for real-time updates
  useEffect(() => {
    if (!token) return;

    const socket = io(`${SOCKET_URL}/notifications`, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
    });

    socket.on('notification', (payload: Omit<Notification, 'id' | 'read'>) => {
      setNotifications((prev) => {
        const exists = prev.some(
          (n) => n.title === payload.title && n.message === payload.message && n.timestamp === payload.timestamp,
        );
        if (exists) return prev;
        const notif: Notification = {
          ...payload,
          id: crypto.randomUUID(),
          read: false,
        };
        return [notif, ...prev].slice(0, 50);
      });
    });

    socket.on('notifications_cleared', () => {
      setNotifications([]);
    });

    socket.on('all_read', () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    });

    return () => {
      socket.off('notification');
      socket.off('notifications_cleared');
      socket.off('all_read');
      socket.disconnect();
    };
  }, [token]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // fallback: optimistically mark all as read even if API fails
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await apiClient.delete('/notifications');
    } catch {
      // proceed with local clear even if API call fails
    }
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAllRead, markRead, clearAll, connected }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error('useNotifications must be used inside <NotificationProvider>');
  return ctx;
}
