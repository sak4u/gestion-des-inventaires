import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { io } from 'socket.io-client';
import { getWebSocketBaseUrl } from '../lib/ws';

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

  useEffect(() => {
    const baseUrl = getWebSocketBaseUrl();
    const socket = io(`${baseUrl}/notifications`, {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
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
  }, []);

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
