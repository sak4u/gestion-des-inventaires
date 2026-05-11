import { useNavigate } from 'react-router-dom';
import { KpiCard } from '../ui/index';
import type { Kpis, Proposition, Fournisseur, Commande } from '../../types/dashboard';

interface PurchaserDashboardProps {
  kpis: Kpis | null;
  propositions: Proposition[];
  fournisseurs: Fournisseur[];
  commandes: Commande[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Sum total amount of all ACHAT commands this month. */
const monthlySpend = (commandes: Commande[]): number => {
  const now = new Date();
  return commandes
    .filter((c) => {
      const d = new Date(c.dateCreation);
      return c.type === 'ACHAT' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((total, c) => {
      const lignesTotal = (c.commandesLigne ?? []).reduce(
        (sum, l) => sum + l.quantite * (l.prixUnitaire ?? 0),
        0,
      );
      return total + lignesTotal;
    }, 0);
};

/** Count EN_COURS ACHAT commands (reception in progress). */
const pendingReceptions = (commandes: Commande[]): number =>
  commandes.filter((c) => c.type === 'ACHAT' && c.etat === 'EN_COURS').length;

// ═════════════════════════════════════════════════════════════════════════════
export default function PurchaserDashboard({ kpis, propositions, fournisseurs, commandes }: PurchaserDashboardProps) {
  const navigate = useNavigate();

  const spend = monthlySpend(commandes);
  const receptions = pendingReceptions(commandes);
  const recentCommandes = [...commandes].slice(0, 5);

  return (
    <div className="purchaser-dashboard">

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <div className="kpi-grid">
        <KpiCard icon="🤝" label="Total Fournisseurs"  value={fournisseurs.length}             color="blue"   />
        <KpiCard icon="🧾" label="Commandes en cours"  value={kpis?.commandesEnCours ?? 0}     color="orange" />
        <KpiCard icon="📦" label="Réceptions Prévues"  value={receptions}                      color="green"  />
        <KpiCard icon="💰" label="Dépenses ce mois"    value={`${spend.toFixed(2)} DT`}        color="blue"   />
      </div>

      <div className="dashboard-sections-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>

        {/* ── Top suppliers ────────────────────────────────────────── */}
        <div className="chart-card">
          <p className="chart-title">🤝 Top Fournisseurs</p>

          {fournisseurs.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
              Aucun fournisseur disponible.
            </p>
          ) : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                  <th style={{ padding: '8px' }}>Nom</th>
                  <th style={{ padding: '8px' }}>Produits liés</th>
                </tr>
              </thead>
              <tbody>
                {fournisseurs.slice(0, 5).map((f) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid rgba(59,130,246,0.05)', cursor: 'pointer' }}
                    onClick={() => navigate(`/fournisseurs/${f.id}`)}
                  >
                    <td style={{ padding: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>{f.nom}</td>
                    <td style={{ padding: '8px', color: 'var(--accent-light)' }}>
                      {(f.fournisseurProduits as unknown[])?.length ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Recent orders ─────────────────────────────────────────── */}
        <div className="chart-card">
          <p className="chart-title">🧾 Dernières Commandes</p>

          {recentCommandes.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
              Aucune commande récente.
            </p>
          ) : (
            <div className="activity-list">
              {recentCommandes.map((c) => (
                <div
                  key={c.id}
                  className="activity-item"
                  style={{ padding: '10px', borderBottom: '1px solid rgba(59,130,246,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => navigate(`/commandes/${c.id}`)}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {c.fournisseur?.nom ?? 'Commande de vente'}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {new Date(c.dateCreation).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                    background: c.etat === 'EN_COURS' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                    color: c.etat === 'EN_COURS' ? '#f59e0b' : '#10b981',
                  }}>
                    {c.etat}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── AI suggestions ───────────────────────────────────────────── */}
      {propositions.length > 0 && (
        <div className="chart-card" style={{ marginTop: '20px' }}>
          <p className="chart-title">🤖 Suggestions de Commande (IA)</p>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                <th style={{ padding: '8px' }}>Produit</th>
                <th style={{ padding: '8px' }}>Quantité suggérée</th>
                <th style={{ padding: '8px' }}>Fournisseur idéal</th>
              </tr>
            </thead>
            <tbody>
              {propositions.map((p) => (
                <tr
                  key={p.id}
                  style={{ borderBottom: '1px solid rgba(59,130,246,0.05)', cursor: 'pointer' }}
                  onClick={() => navigate('/propositions')}
                >
                  <td style={{ padding: '8px' }}>{p.produit?.nom ?? '—'}</td>
                  <td style={{ padding: '8px', fontWeight: 700, color: 'var(--accent-light)' }}>{p.quantiteProposee}</td>
                  <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{p.fournisseur?.nom ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
