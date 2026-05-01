import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import MainLayout from './layouts/MainLayout';
import { InstallPWA } from './components/ui/index';

// ── Auth pages (already built) ────────────────────────────────────────────────
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
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
      <Route path="/register"        element={<RegisterPage />} />
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
            <MainLayout><ProduitsPage /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/produits/:id"
        element={
          <RequireAuth>
            <MainLayout><ProduitDetailPage /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/entrepots"
        element={
          <RequireAuth>
            <MainLayout><EntrepotsPage /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/entrepots/:id"
        element={
          <RequireAuth>
            <MainLayout><EntrepotDetailPage /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/fournisseurs"
        element={
          <RequireAuth>
            <MainLayout><FournisseursPage /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/fournisseurs/:id"
        element={
          <RequireAuth>
            <MainLayout><FournisseurDetailPage /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/commandes"
        element={
          <RequireAuth>
            <MainLayout><CommandesPage /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/commandes/:id"
        element={
          <RequireAuth>
            <MainLayout><CommandeDetailPage /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/commandes/nouvelle"
        element={
          <RequireAuth>
            <MainLayout><NouvelleCommandePage /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/flux-de-stock"
        element={
          <RequireAuth>
            <MainLayout><FluxDeStockPage /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/propositions"
        element={
          <RequireAuth>
            <MainLayout><PropositionsPage /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/utilisateurs"
        element={
          <RequireAuth>
            <RequireRole roles={['ADMINISTRATEUR']}>
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
