import { useNavigate } from 'react-router-dom';
import { KpiCard } from '../ui/index';
import type { Kpis, Proposition, EntrepotStock } from '../../types/dashboard';

interface StockManagerDashboardProps {
  kpis: Kpis | null;
  propositions: Proposition[];
  entrepots: EntrepotStock[];
}

// ── Helper ────────────────────────────────────────────────────────────────────

/** Global fill percentage across all warehouses (valeur used as proxy for quantity). */
const globalCapacityLabel = (entrepots: EntrepotStock[]): string => {
  const total = entrepots.reduce((sum, e) => sum + e.valeur, 0);
  if (total === 0) return '—';
  return `${(total / 1000).toFixed(1)} k DT`;
};

// ═════════════════════════════════════════════════════════════════════════════
export default function StockManagerDashboard({ kpis, propositions, entrepots }: StockManagerDashboardProps) {
  const navigate = useNavigate();

  return (
    <div className="stock-manager-dashboard">

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <div className="kpi-grid">
        <KpiCard icon="📦" label="Total Produits"    value={kpis?.totalProduits ?? 0}     color="blue"   />
        <KpiCard icon="⚠️" label="Alertes Stock"    value={kpis?.produitsEnAlerte ?? 0}   color="red"    />
        <KpiCard icon="🤖" label="Prévisions IA"    value={propositions.length}           color="blue"   />
        <KpiCard icon="💰" label="Valeur Stock"     value={globalCapacityLabel(entrepots)} color="orange" />
      </div>

      <div className="dashboard-sections-grid">

        {/* ── Propositions ─────────────────────────────────────────── */}
        <div className="chart-card">
          <p className="chart-title">🤖 Propositions de Réapprovisionnement</p>

          {propositions.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '10px 0', color: '#94a3b8', fontSize: 13 }}>
              Aucune proposition en attente.
            </p>
          ) : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                  <th style={{ padding: '8px' }}>Produit</th>
                  <th style={{ padding: '8px' }}>Qté</th>
                  <th style={{ padding: '8px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {propositions.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)' }}>
                    <td style={{ padding: '8px', fontWeight: 500 }}>{p.produit?.nom ?? '—'}</td>
                    <td style={{ padding: '8px', fontWeight: 700, color: 'var(--accent-light)' }}>{p.quantiteProposee}</td>
                    <td style={{ padding: '8px' }}>
                      <button
                        id={`btn-detail-prop-${p.id}`}
                        className="btn-secondary"
                        style={{ padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}
                        onClick={() => navigate('/propositions')}
                      >
                        Détails
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Entrepots state ──────────────────────────────────────── */}
        <div className="chart-card">
          <p className="chart-title">📊 État des Entrepôts</p>

          {entrepots.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
              Aucune donnée d'entrepôt disponible.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {entrepots.map((e) => {
                const pct = (e as any).capaciteMax && (e as any).capaciteMax > 0
                  ? Math.min(((e as any).stockTotalEntrepot ?? 0) / (e as any).capaciteMax * 100, 100)
                  : null;
                const barColor = pct === null ? 'var(--accent-light)'
                  : pct >= 90 ? '#ef4444'
                  : pct >= 70 ? '#f97316'
                  : '#22c55e';
                const statusLabel = pct === null ? null
                  : pct >= 90 ? '🔴 Plein'
                  : pct >= 70 ? '⚠️ Presque plein'
                  : null;
                return (
                  <div key={e.nom}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {e.nom}
                        {statusLabel && <span style={{ fontSize: 11, fontWeight: 700, color: pct! >= 90 ? '#ef4444' : '#f97316' }}>{statusLabel}</span>}
                      </span>
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                        {e.valeur.toFixed(0)} DT
                        {pct !== null && <span style={{ color: barColor, fontWeight: 700, marginLeft: 8 }}>({pct.toFixed(0)}%)</span>}
                      </span>
                    </div>
                    {pct !== null && (
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: barColor,
                          borderRadius: 99,
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
