import { useNavigate } from 'react-router-dom';
import { Package, Upload, AlertTriangle, Undo2, Wrench, Shuffle, Bell, RefreshCw, Inbox } from 'lucide-react';
import { KpiCard } from '../ui/index';
import type { Flux } from '../../types/dashboard';

interface WarehouseDashboardProps {
  recentFlux: Flux[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────


const FLUX_ICON: Record<string, React.ReactNode> = {
  achat: <Inbox size={16} />, vente: <Upload size={16} />, perte: <AlertTriangle size={16} />,
  retour: <Undo2 size={16} />, correction_inventaire: <Wrench size={16} />, transfert: <Shuffle size={16} />,
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
      <div className="warehouse-quick-actions">
        <button
          id="btn-scan-entree"
          className="btn btn--primary"
          style={{ padding: '20px', fontSize: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', borderRadius: '15px', cursor: 'pointer' }}
          onClick={() => navigate('/commandes', { state: { typeFilter: 'ACHAT', etatFilter: 'EN_COURS', openScanner: true } })}
          title="Réception de commandes"
        >
          <Package size={30} />
          Réception Achat
        </button>

        <button
          id="btn-scan-sortie"
          className="btn btn--secondary"
          style={{ padding: '20px', fontSize: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', borderRadius: '15px', cursor: 'pointer' }}
          onClick={() => navigate('/flux-de-stock', { state: { openModal: true, fluxType: 'vente' } })}
          title="Enregistrer une sortie de stock"
        >
          <Upload size={30} />
          Scanne Sortie
        </button>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <div className="kpi-grid">
        <KpiCard icon={<Package size={24} />} label="Mouvements récents" value={recentFlux.length} color="blue" />
        <KpiCard icon={<Bell size={24} />} label="Pertes signalées" value={alertCount} color="orange" />
      </div>

      {/* ── Recent movements ─────────────────────────────────────────── */}
      <div className="chart-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <RefreshCw size={20} />
          <p className="chart-title" style={{ marginBottom: 0 }}>Mouvements Récents</p>
        </div>

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
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {FLUX_ICON[f.type] ?? <RefreshCw size={16} />} {f.produit?.nom ?? '—'}
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
        onClick={() => navigate('/flux-de-stock')}
      >
        Voir tout l'historique
      </button>
    </div>
  );
}
