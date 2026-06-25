import * as React from 'react';
import { io } from 'socket.io-client';
import { apiClient } from '../api/index';

const { createContext, useContext, useEffect, useState, useCallback, useRef } = React;
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
  const readIdsRef = useRef<Set<string>>(new Set());

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
          read: readIdsRef.current.has(n.id),
          data: n.data ?? undefined,
        }));
        setNotifications(mapped);
        setConnected(true);
      } catch {
        if (active) setConnected(false);
      }
    };

    // initial fetch
    void poll();

    const interval = setInterval(poll, 10000);

    return () => {
      active = false;
      clearInterval(interval);
      setConnected(false);
    };
  }, [token]);

  // Optional socket.io enhancement for real-time updates (works in local dev)
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
      // Add live notification on top; polling will fill in the rest
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

    return () => {
      socket.off('notification');
      socket.disconnect();
    };
  }, [token]);

  const markRead = useCallback((id: string) => {
    readIdsRef.current.add(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      for (const n of prev) readIdsRef.current.add(n.id);
      return prev.map((n) => ({ ...n, read: true }));
    });
  }, []);

  const clearAll = useCallback(() => {
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
