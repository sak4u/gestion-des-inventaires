import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import MainLayout from './layouts/MainLayout';
import { InstallPWA } from './components/ui/index';

// ── Auth pages (already built) ────────────────────────────────────────────────
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

// ── App pages ─────────────────────────────────────────────────────────────────
import DashboardPage from './pages/DashboardPage';
import ProduitsPage from './pages/ProduitsPage';
import ProduitDetailPage from './pages/ProduitDetailPage';
import EntrepotsPage from './pages/EntrepotsPage';
import EntrepotDetailPage from './pages/EntrepotDetailPage';
import FournisseursPage from './pages/FournisseursPage';
import FournisseurDetailPage from './pages/FournisseurDetailPage';
import CommandesPage from './pages/CommandesPage';
import CommandeDetailPage from './pages/CommandeDetailPage';
import NouvelleCommandePage from './pages/NouvelleCommandePage';
import FluxDeStockPage from './pages/FluxDeStockPage';
import PropositionsPage from './pages/PropositionsPage';
import UtilisateursPage from './pages/UtilisateursPage';

// ── Guards ────────────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function RequireRole({
  roles,
  children,
}: {
  roles: string[];
  children: React.ReactNode;
}) {
  const { hasRole } = useAuth();
  return hasRole(...roles) ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

// ── Router ────────────────────────────────────────────────────────────────────
function AppRouter() {
  return (
    <Routes>
      {/* Default */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public */}
      <Route path="/login"           element={<LoginPage />} />
      <Route path="/register"        element={<Navigate to="/login" replace />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected — all wrapped in MainLayout */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <MainLayout><DashboardPage /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/produits"
        element={
          <RequireAuth>
            <RequireRole roles={['ADMIN', 'RESPONSABLE_STOCK', 'ACHAT']}>
              <MainLayout><ProduitsPage /></MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/produits/:id"
        element={
          <RequireAuth>
            <RequireRole roles={['ADMIN', 'RESPONSABLE_STOCK', 'ACHAT']}>
              <MainLayout><ProduitDetailPage /></MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/entrepots"
        element={
          <RequireAuth>
            <RequireRole roles={['ADMIN', 'RESPONSABLE_STOCK']}>
              <MainLayout><EntrepotsPage /></MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/entrepots/:id"
        element={
          <RequireAuth>
            <RequireRole roles={['ADMIN', 'RESPONSABLE_STOCK']}>
              <MainLayout><EntrepotDetailPage /></MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/fournisseurs"
        element={
          <RequireAuth>
            <RequireRole roles={['ADMIN', 'RESPONSABLE_STOCK', 'ACHAT']}>
              <MainLayout><FournisseursPage /></MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/fournisseurs/:id"
        element={
          <RequireAuth>
            <RequireRole roles={['ADMIN', 'RESPONSABLE_STOCK', 'ACHAT']}>
              <MainLayout><FournisseurDetailPage /></MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/commandes"
        element={
          <RequireAuth>
            <RequireRole roles={['ADMIN', 'ACHAT', 'RESPONSABLE_STOCK']}>
              <MainLayout><CommandesPage /></MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/commandes/nouvelle"
        element={
          <RequireAuth>
            <RequireRole roles={['ADMIN', 'ACHAT', 'RESPONSABLE_STOCK']}>
              <MainLayout><NouvelleCommandePage /></MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/commandes/:id"
        element={
          <RequireAuth>
            <RequireRole roles={['ADMIN', 'ACHAT', 'RESPONSABLE_STOCK']}>
              <MainLayout><CommandeDetailPage /></MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/flux-de-stock"
        element={
          <RequireAuth>
            <RequireRole roles={['ADMIN', 'RESPONSABLE_STOCK']}>
              <MainLayout><FluxDeStockPage /></MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/propositions"
        element={
          <RequireAuth>
            <RequireRole roles={['ADMIN', 'RESPONSABLE_STOCK', 'ACHAT']}>
              <MainLayout><PropositionsPage /></MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/utilisateurs"
        element={
          <RequireAuth>
            <RequireRole roles={['ADMIN']}>
              <MainLayout><UtilisateursPage /></MainLayout>
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRouter />
          <InstallPWA />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
