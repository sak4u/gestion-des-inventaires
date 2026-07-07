import { useNavigate } from 'react-router-dom';
import { Package, Upload, AlertTriangle, Undo2, Wrench, Shuffle, Bell, RefreshCw, Inbox } from 'lucide-react';
import { KpiCard } from '../ui/index';
import type { Kpis, Proposition, EntrepotStock, Flux } from '../../types/dashboard';

interface StockManagerDashboardProps {
  kpis: Kpis | null;
  propositions: Proposition[];
  entrepots: EntrepotStock[];
  recentFlux: Flux[];
}

const FLUX_ICON: Record<string, React.ReactNode> = {
  achat: <Inbox size={16} />,
  vente: <Upload size={16} />,
  perte: <AlertTriangle size={16} />,
  retour: <Undo2 size={16} />,
  correction_inventaire: <Wrench size={16} />,
  transfert: <Shuffle size={16} />,
};

const FLUX_COLOR: Record<string, string> = {
  achat: '#10b981',
  retour: '#f59e0b',
};

const globalCapacityLabel = (entrepots: EntrepotStock[]): string => {
  const total = entrepots.reduce((sum, e) => sum + e.valeur, 0);
  if (total === 0) return '—';
  return `${(total / 1000).toFixed(1)} k DT`;
};

export default function StockManagerDashboard({
  kpis,
  propositions,
  entrepots,
  recentFlux,
}: StockManagerDashboardProps) {
  const navigate = useNavigate();
  const alertCount = recentFlux.filter((f) => f.type === 'perte').length;

  return (
    <div className="stock-manager-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div className="warehouse-quick-actions">
        <button
          className="btn btn--primary"
          style={{ padding: '20px', fontSize: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', borderRadius: '15px', cursor: 'pointer' }}
          onClick={() => navigate('/commandes', { state: { typeFilter: 'ACHAT', etatFilter: 'EN_COURS', openScanner: true } })}
          title="Réception de commandes"
        >
          <Package size={30} />
          Réception Achat
        </button>
        <button
          className="btn btn--secondary"
          style={{ padding: '20px', fontSize: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', borderRadius: '15px', cursor: 'pointer' }}
          onClick={() => navigate('/flux-de-stock', { state: { openModal: true, fluxType: 'vente' } })}
          title="Enregistrer une sortie de stock"
        >
          <Upload size={30} />
          Scanner Sortie
        </button>
      </div>

      <div className="kpi-grid">
        <KpiCard icon="📦" label="Total Produits" value={kpis?.totalProduits ?? 0} color="blue" />
        <KpiCard icon="⚠️" label="Alertes Stock" value={kpis?.produitsEnAlerte ?? 0} color="red" />
        <KpiCard icon="🤖" label="Prévisions IA" value={propositions.length} color="blue" />
        <KpiCard icon="💰" label="Valeur Stock" value={globalCapacityLabel(entrepots)} color="orange" />
        <KpiCard icon={<RefreshCw size={24} />} label="Mouvements récents" value={recentFlux.length} color="blue" />
        <KpiCard icon={<Bell size={24} />} label="Pertes signalées" value={alertCount} color="orange" />
      </div>

      <div className="dashboard-sections-grid">
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

        <div className="chart-card">
          <p className="chart-title">📊 État des Entrepôts</p>
          {entrepots.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
              Aucune donnée d'entrepôt disponible.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {entrepots.map((e) => {
                const ext = e as EntrepotStock & { capaciteMax?: number; stockTotalEntrepot?: number };
                const pct =
                  ext.capaciteMax && ext.capaciteMax > 0
                    ? Math.min(((ext.stockTotalEntrepot ?? 0) / ext.capaciteMax) * 100, 100)
                    : null;
                const barColor =
                  pct === null ? 'var(--accent-light)' : pct >= 90 ? '#ef4444' : pct >= 70 ? '#f97316' : '#22c55e';
                const statusLabel =
                  pct === null ? null : pct >= 90 ? '🔴 Plein' : pct >= 70 ? '⚠️ Presque plein' : null;
                return (
                  <div key={e.nom}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {e.nom}
                        {statusLabel && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: pct! >= 90 ? '#ef4444' : '#f97316' }}>
                            {statusLabel}
                          </span>
                        )}
                      </span>
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                        {e.valeur.toFixed(0)} DT
                        {pct !== null && (
                          <span style={{ color: barColor, fontWeight: 700, marginLeft: 8 }}>({pct.toFixed(0)}%)</span>
                        )}
                      </span>
                    </div>
                    {pct !== null && (
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: barColor,
                            borderRadius: 99,
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="chart-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <RefreshCw size={20} />
          <p className="chart-title" style={{ marginBottom: 0 }}>
            Mouvements Récents
          </p>
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
                  style={{
                    padding: '12px 10px',
                    borderBottom: '1px solid rgba(59,130,246,0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
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
                    {isPositive ? '+' : '-'}
                    {f.quantite}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button className="btn btn--outline" style={{ padding: '15px', cursor: 'pointer' }} onClick={() => navigate('/flux-de-stock')}>
        Voir tout l'historique
      </button>
    </div>
  );
}
