import * as React from 'react';
import { io } from 'socket.io-client';

const { createContext, useContext, useEffect, useState, useCallback } = React;
type ReactNode = React.ReactNode;

// Always connect directly to the NestJS backend to avoid Vite HMR proxy conflicts
// Use VITE_WS_URL from .env if available, otherwise fallback to local/origin
const SOCKET_URL = import.meta.env.VITE_WS_URL ?? (import.meta.env.DEV
  ? 'http://localhost:3000'
  : window.location.origin);

// ── Types ─────────────────────────────────────────────────────────────────────
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

  // Listen for login/logout (storage changes) from other tabs or same tab updates
  useEffect(() => {
    const handleStorage = () => {
      const currentToken = localStorage.getItem('access_token');
      setToken(currentToken);
    };

    window.addEventListener('storage', handleStorage);
    // Custom event for same-window updates if needed (AuthContext could emit this)
    window.addEventListener('auth_update', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('auth_update', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setConnected(false);
      return;
    }

    console.log('[WS] Connecting to:', `${SOCKET_URL}/notifications`);
    const socket = io(`${SOCKET_URL}/notifications`, {
      path: '/socket.io/',
      transports: ['websocket'],
      auth: { token },
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
    });

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    
    const onNotification = (payload: Omit<Notification, 'id' | 'read'>) => {
      const notif: Notification = {
        ...payload,
        id: crypto.randomUUID(),
        read: false,
      };
      setNotifications((prev) => [notif, ...prev].slice(0, 50));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('notification', onNotification);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('notification', onNotification);
      socket.disconnect();
    };
  }, [token]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

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
