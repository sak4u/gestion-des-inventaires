import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { Badge, EmptyState, Spinner } from '../components/ui/index';
import { commandesApi } from '../api/index';

type CommandeEtat = 'EN_COURS' | 'FERMEE' | 'LIVREE' | 'ANNULEE';
interface CommandeLine {
  id: string;
  quantite: number;
  prixUnitaire?: number;
  produit?: { nom?: string };
}
interface Commande {
  id: string;
  type: 'ACHAT' | 'VENTE';
  etat: CommandeEtat;
  dateCreation: string;
  fournisseur?: { nom?: string; email?: string };
  entrepot?: { nom?: string };
  user?: { name?: string; email?: string };
  commandesLigne?: CommandeLine[];
}

const ETAT_BADGE: Record<CommandeEtat, 'orange' | 'gray' | 'green' | 'red'> = {
  EN_COURS: 'orange',
  FERMEE: 'gray',
  LIVREE: 'green',
  ANNULEE: 'red',
};

export default function CommandeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [commande, setCommande] = useState<Commande | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await commandesApi.get(id);
        setCommande(res.data as Commande);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const total = useMemo(
    () =>
      (commande?.commandesLigne ?? []).reduce(
        (sum, l) => sum + l.quantite * (l.prixUnitaire ?? 0),
        0,
      ),
    [commande],
  );

  const updateEtat = async (etat: CommandeEtat) => {
    if (!commande) return;
    setUpdating(true);
    try {
      await commandesApi.update(commande.id, { etat });
      const refreshed = await commandesApi.get(commande.id);
      setCommande(refreshed.data as Commande);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spinner size={40} />
      </div>
    );
  }

  if (!commande) {
    return (
      <EmptyState
        icon="❓"
        title="Commande introuvable"
        subtitle="La commande n'existe pas ou a été supprimée."
      />
    );
  }

  return (
    <div>
      <PageHeader
        icon="🧾"
        title={`Commande ${commande.id.slice(0, 8)}…`}
        subtitle={`Créée le ${new Date(commande.dateCreation).toLocaleDateString('fr-FR')}`}
        actions={
          <button className="btn-secondary" onClick={() => navigate('/commandes')}>
            ← Retour
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div className="kpi-card">
          <div>
            <p className="kpi-label">Type</p>
            <p className="kpi-value" style={{ fontSize: 18 }}>{commande.type}</p>
          </div>
        </div>
        <div className="kpi-card">
          <div>
            <p className="kpi-label">Etat</p>
            <p style={{ marginTop: 8 }}>
              <Badge variant={ETAT_BADGE[commande.etat]}>{commande.etat}</Badge>
            </p>
          </div>
        </div>
        {commande.type === 'ACHAT' && (
          <div className="kpi-card">
            <div>
              <p className="kpi-label">Fournisseur</p>
              <p className="kpi-value" style={{ fontSize: 16 }}>{commande.fournisseur?.nom ?? '—'}</p>
            </div>
          </div>
        )}
        <div className="kpi-card">
          <div>
            <p className="kpi-label">Total</p>
            <p className="kpi-value" style={{ fontSize: 20, color: 'var(--success)' }}>{total.toFixed(2)} DT</p>
          </div>
        </div>
      </div>

      <div className="chart-card" style={{ marginBottom: 20 }}>
        <p className="chart-title">Informations</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 14 }}>
          <p><strong>Entrepôt :</strong> {commande.entrepot?.nom ?? '—'}</p>
          <p><strong>Créé par :</strong> {commande.user?.name ?? '—'}</p>
          {commande.type === 'ACHAT' && <p><strong>Email fournisseur :</strong> {commande.fournisseur?.email ?? '—'}</p>}
          <p><strong>Email utilisateur :</strong> {commande.user?.email ?? '—'}</p>
        </div>
      </div>

      <div className="chart-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p className="chart-title" style={{ marginBottom: 0 }}>Lignes de commande</p>
          {commande.etat === 'EN_COURS' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-primary-sm"
                onClick={() => updateEtat('LIVREE')}
                disabled={updating}
              >
                ✅ Marquer {commande.type === 'ACHAT' ? 'livrée' : 'expédiée'}
              </button>
              <button
                className="btn-danger"
                onClick={() => updateEtat('ANNULEE')}
                disabled={updating}
              >
                ✖ Annuler commande
              </button>
            </div>
          )}
        </div>

        {commande.commandesLigne?.length ? (
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Quantite</th>
                  <th>Prix unitaire</th>
                  <th>Total ligne</th>
                </tr>
              </thead>
              <tbody>
                {commande.commandesLigne.map((l) => (
                  <tr key={l.id} className="table-row">
                    <td>{l.produit?.nom ?? '—'}</td>
                    <td>{l.quantite}</td>
                    <td>{(l.prixUnitaire ?? 0).toFixed(2)} DT</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                      {(l.quantite * (l.prixUnitaire ?? 0)).toFixed(2)} DT
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="📭" title="Aucune ligne" subtitle="Cette commande ne contient aucune ligne." />
        )}
      </div>
    </div>
  );
}

