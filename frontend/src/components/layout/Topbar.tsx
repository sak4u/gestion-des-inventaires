import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications, type Notification } from '../../contexts/NotificationContext';

export default function Topbar({ pageTitle }: { pageTitle?: string }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, clearAll, connected } =
    useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const notifsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node))
        setShowNotifs(false);
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setShowUser(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const notifIcon = (type: Notification['type']) => {
    switch (type) {
      case 'stock_alert': return '⚠️';
      case 'proposition': return '🤖';
      case 'commande':    return '🧾';
      default:            return 'ℹ️';
    }
  };

  return (
    <header className="topbar">
      {/* Page title */}
      <div className="topbar-left">
        {pageTitle && <h1 className="topbar-title">{pageTitle}</h1>}
        <div className={`ws-indicator ${connected ? 'ws-indicator--on' : 'ws-indicator--off'}`}>
          <span className="ws-dot" />
          <span>{connected ? 'En ligne' : 'Déconnecté'}</span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Notifications */}
        <div className="topbar-dropdown" ref={notifsRef}>
          <button
            className="topbar-icon-btn"
            onClick={() => { setShowNotifs(!showNotifs); setShowUser(false); }}
            id="btn-notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span className="badge-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showNotifs && (
            <div className="dropdown-panel dropdown-panel--notifs">
              <div className="dropdown-header">
                <span>Notifications</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="dropdown-action" onClick={markAllRead}>Tout lire</button>
                  <button className="dropdown-action" onClick={clearAll}>Effacer</button>
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="dropdown-empty">Aucune notification</div>
              ) : (
                <div className="notif-list">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item ${n.read ? '' : 'notif-item--unread'}`}
                      onClick={() => markRead(n.id)}
                    >
                      <span className="notif-icon">{notifIcon(n.type)}</span>
                      <div className="notif-body">
                        <p className="notif-title">{n.title}</p>
                        <p className="notif-msg">{n.message}</p>
                        <p className="notif-time">
                          {new Date(n.timestamp).toLocaleTimeString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="topbar-dropdown" ref={userRef}>
          <button
            className="topbar-avatar"
            onClick={() => { setShowUser(!showUser); setShowNotifs(false); }}
            id="btn-user-menu"
          >
            {user?.name.charAt(0).toUpperCase() ?? '?'}
          </button>

          {showUser && (
            <div className="dropdown-panel dropdown-panel--user">
              <div className="dropdown-user-info">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
                <span className="role-tag">{user?.role?.name}</span>
              </div>
              <button className="dropdown-logout" onClick={logout}>
                🚪 Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
