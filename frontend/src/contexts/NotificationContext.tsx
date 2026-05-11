import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';

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

const WS_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket = io(`${WS_URL}/notifications`, {
      transports: ['websocket'],
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('notification', (payload: Omit<Notification, 'id' | 'read'>) => {
      const notif: Notification = {
        ...payload,
        id: crypto.randomUUID(),
        read: false,
      };
      setNotifications((prev) => [notif, ...prev].slice(0, 50));
    });

    return () => {
      socket?.disconnect();
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
