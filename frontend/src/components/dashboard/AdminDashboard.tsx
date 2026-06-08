import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { KpiCard } from '../ui/index';
import type { Kpis, FluxPoint, EntrepotStock, Flux, User } from '../../types/dashboard';

interface AdminDashboardProps {
  kpis: Kpis | null;
  fluxData: FluxPoint[];
  entrepotData: EntrepotStock[];
  recentFlux: Flux[];
  users: User[];
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const ROLE_COLOR: Record<string, string> = {
  ADMIN: '#8b5cf6',
  RESPONSABLE_STOCK: '#3b82f6',
  ACHAT: '#f59e0b',
};

// ═════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard({ kpis, fluxData, entrepotData, recentFlux, users }: AdminDashboardProps) {
  const navigate = useNavigate();

  const pieData = useMemo(
    () => entrepotData.filter((item) => item.valeur > 0),
    [entrepotData],
  );

  return (
    <div className="admin-dashboard">

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <div className="kpi-grid">
        <KpiCard icon="📦" label="Total Produits"      value={kpis?.totalProduits ?? 0}                       color="blue"   />
        <KpiCard icon="⚠️" label="Alertes Stock"       value={kpis?.produitsEnAlerte ?? 0}                    color="red"    />
        <KpiCard icon="🧾" label="Commandes en cours"  value={kpis?.commandesEnCours ?? 0}                    color="orange" />
        <KpiCard icon="💰" label="Valeur Stock (Coût)" value={`${(kpis?.valeurStock ?? 0).toLocaleString()} DT`} color="blue" />
        <KpiCard icon="📈" label="Chiffre d'Affaires"  value={`${(kpis?.revenue ?? 0).toLocaleString()} DT`}  color="green"  />
        <KpiCard icon="🏦" label="Profit Brut"         value={`${(kpis?.profit ?? 0).toLocaleString()} DT`}   color="blue"   />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────── */}
      <div className="charts-grid">
        <div className="chart-card">
          <p className="chart-title">📈 Mouvements Système (7 derniers jours)</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={fluxData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="entrees" stroke="#10b981" strokeWidth={2} name="Entrées" />
              <Line type="monotone" dataKey="sorties" stroke="#3b82f6" strokeWidth={2} name="Sorties" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <p className="chart-title">🏭 Répartition par Entrepôt</p>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="valeur" nameKey="nom">
                {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => `${Number(v).toLocaleString()} DT`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-sections-grid">

        {/* ── Users list ────────────────────────────────────────────── */}
        <div className="chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p className="chart-title" style={{ margin: 0 }}>👥 Utilisateurs ({users.length})</p>
            <button
              id="btn-gerer-utilisateurs"
              className="btn-secondary"
              style={{ padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}
              onClick={() => navigate('/utilisateurs')}
            >
              Gérer →
            </button>
          </div>

          {users.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              Aucun utilisateur trouvé.
            </p>
          ) : (
            <div>
              {users.slice(0, 6).map((u) => (
                <div
                  key={u.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(59,130,246,0.05)', fontSize: 13 }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                    <span style={{ color: '#94a3b8', marginLeft: 8, fontSize: 11 }}>{u.email}</span>
                  </div>
                  {u.role?.name && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: `${ROLE_COLOR[u.role.name] ?? '#94a3b8'}22`,
                      color: ROLE_COLOR[u.role.name] ?? '#94a3b8',
                    }}>
                      {u.role.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Real-time activity ────────────────────────────────────── */}
        <div className="chart-card">
          <p className="chart-title">🕒 Activité Temps Réel</p>
          <div className="activity-list">
            {recentFlux.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                Aucun mouvement récent.
              </p>
            ) : (
              recentFlux.map((f) => (
                <div
                  key={f.id}
                  className="activity-item"
                  style={{ padding: '8px 0', borderBottom: '1px solid rgba(59,130,246,0.05)', fontSize: 13 }}
                >
                  <strong style={{ color: 'var(--text-primary)' }}>{f.type.toUpperCase()}</strong>
                  {': '}
                  <span style={{ color: 'var(--text-secondary)' }}>{f.produit?.nom ?? '—'}</span>
                  <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 6 }}>({f.quantite} unités)</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
