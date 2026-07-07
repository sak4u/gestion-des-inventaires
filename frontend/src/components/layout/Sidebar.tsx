import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard',     icon: '📊', label: 'Tableau de bord' },
  {
    path: '/produits',
    icon: '📦',
    label: 'Produits',
    roles: ['ADMIN', 'RESPONSABLE_STOCK', 'ACHAT'],
  },
  {
    path: '/entrepots',
    icon: '🏭',
    label: 'Entrepôts',
    roles: ['ADMIN', 'RESPONSABLE_STOCK'],
  },
  {
    path: '/fournisseurs',
    icon: '🤝',
    label: 'Fournisseurs',
    roles: ['ADMIN', 'RESPONSABLE_STOCK', 'ACHAT'],
  },
  {
    path: '/commandes',
    icon: '🧾',
    label: 'Commandes',
    roles: ['ADMIN', 'ACHAT', 'RESPONSABLE_STOCK'],
  },
  {
    path: '/flux-de-stock',
    icon: '🔄',
    label: 'Flux de Stock',
    roles: ['ADMIN', 'RESPONSABLE_STOCK'],
  },
  {
    path: '/propositions',
    icon: '🤖',
    label: 'Propositions IA',
    roles: ['ADMIN', 'RESPONSABLE_STOCK', 'ACHAT'],
  },
  {
    path: '/utilisateurs',
    icon: '👥',
    label: 'Utilisateurs',
    roles: ['ADMIN'],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, hasRole } = useAuth();
  const location = useLocation();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || hasRole(...item.roles),
  );

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">📦</div>
        {!collapsed && (
          <div className="sidebar-logo-text">
            <strong>InvenTrack</strong>
            <span>Gestion des stocks</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            {!collapsed && (
              <span className="sidebar-link-label">{item.label}</span>
            )}
            {!collapsed && location.pathname === item.path && (
              <span className="sidebar-link-indicator" />
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      {!collapsed && user && (
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user.name}</span>
            <span className="sidebar-user-role">{user.role?.name ?? '—'}</span>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button className="sidebar-toggle" onClick={onToggle} title="Réduire sidebar">
        {collapsed ? '▶' : '◀'}
      </button>
    </aside>
  );
}
