import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Tableau de bord',
  '/produits':      'Produits',
  '/entrepots':     'Entrepôts',
  '/fournisseurs':  'Fournisseurs',
  '/commandes':     'Commandes',
  '/flux-de-stock': 'Flux de Stock',
  '/propositions':  'Propositions IA',
  '/utilisateurs':  'Utilisateurs',
};

export default function MainLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] ?? '';

  return (
    <div className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="app-main">
        <Topbar pageTitle={pageTitle} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
