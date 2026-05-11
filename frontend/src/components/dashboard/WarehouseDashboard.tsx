import { useNavigate } from 'react-router-dom';
import { KpiCard } from '../ui/index';
import type { Flux } from '../../types/dashboard';

interface WarehouseDashboardProps {
  recentFlux: Flux[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────


const FLUX_ICON: Record<string, string> = {
  achat: '📥', vente: '📤', perte: '💔',
  retour: '↩️', correction_inventaire: '🔧', transfert: '🔀',
};

const FLUX_COLOR: Record<string, string> = {
  achat: '#10b981', retour: '#f59e0b',
};

// ═════════════════════════════════════════════════════════════════════════════
export default function WarehouseDashboard({ recentFlux }: WarehouseDashboardProps) {
  const navigate = useNavigate();

  const alertCount = recentFlux.filter((f) => f.type === 'perte').length;

  return (
    <div className="warehouse-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

      {/* ── Quick-action scanner buttons ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button
          id="btn-scan-entree"
          className="btn btn--primary"
          style={{ padding: '20px', fontSize: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', borderRadius: '15px', cursor: 'pointer' }}
          onClick={() => navigate('/flux-de-stocks', { state: { openModal: true, fluxType: 'achat' } })}
          title="Enregistrer une entrée de stock"
        >
          <span style={{ fontSize: '30px' }}>🔍</span>
          Scanne Entrée
        </button>

        <button
          id="btn-scan-sortie"
          className="btn btn--secondary"
          style={{ padding: '20px', fontSize: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', borderRadius: '15px', cursor: 'pointer' }}
          onClick={() => navigate('/flux-de-stocks', { state: { openModal: true, fluxType: 'vente' } })}
          title="Enregistrer une sortie de stock"
        >
          <span style={{ fontSize: '30px' }}>📤</span>
          Scanne Sortie
        </button>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <div className="kpi-grid">
        <KpiCard icon="📦" label="Mouvements récents" value={recentFlux.length} color="blue" />
        <KpiCard icon="🔔" label="Pertes signalées" value={alertCount} color="orange" />
      </div>

      {/* ── Recent movements ─────────────────────────────────────────── */}
      <div className="chart-card">
        <p className="chart-title">🔄 Mouvements Récents</p>

        {recentFlux.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
            Aucun mouvement récent.
          </p>
        ) : (
          <div className="activity-list">
            {recentFlux.map((f) => {
              const isPositive = f.type === 'achat' || f.type === 'retour';
              return (
                <div
                  key={f.id}
                  className="activity-item"
                  style={{ padding: '12px 10px', borderBottom: '1px solid rgba(59,130,246,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {FLUX_ICON[f.type] ?? '🔄'} {f.produit?.nom ?? '—'}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {new Date(f.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: FLUX_COLOR[f.type] ?? (isPositive ? '#10b981' : '#3b82f6') }}>
                    {isPositive ? '+' : '-'}{f.quantite}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── See all button ───────────────────────────────────────────── */}
      <button
        id="btn-voir-historique"
        className="btn btn--outline"
        style={{ padding: '15px', cursor: 'pointer' }}
        onClick={() => navigate('/flux-de-stocks')}
      >
        Voir tout l'historique
      </button>
    </div>
  );
}
