import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { EmptyState, Spinner, SearchInput, Badge } from '../components/ui/index';
import { commandesApi } from '../api/index';

type CommandeType = 'ACHAT' | 'VENTE';
type CommandeEtat = 'EN_COURS' | 'FERMEE' | 'LIVREE' | 'ANNULEE';
interface CommandeLine {
  quantite: number;
  prixUnitaire?: number;
}
interface Commande {
  id: string;
  type: CommandeType;
  etat: CommandeEtat;
  dateCreation: string;
  fournisseur?: { nom?: string };
  entrepot?: { nom?: string };
  commandesLigne?: CommandeLine[];
}

const ETAT_BADGE: Record<string, { label: string; variant: 'blue' | 'green' | 'orange' | 'red' | 'gray' }> = {
  EN_COURS: { label: 'En cours', variant: 'orange' },
  FERMEE:   { label: 'Fermée',   variant: 'gray'   },
  LIVREE:   { label: 'Livrée',   variant: 'green'  },
  ANNULEE:  { label: 'Annulée',  variant: 'red'    },
};

export default function CommandesPage() {
  const navigate = useNavigate();
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading]       = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [etatFilter, setEtatFilter] = useState('');
  const [search, setSearch]         = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (typeFilter) params.type = typeFilter;
      if (etatFilter) params.etat = etatFilter;
      const res = await commandesApi.list(params);
      setCommandes((res.data ?? []) as Commande[]);
    } finally { setLoading(false); }
  }, [typeFilter, etatFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search) return commandes;
    const needle = search.toLowerCase();
    return commandes.filter(
      (c) =>
        (c.fournisseur?.nom?.toLowerCase().includes(needle) ?? false) ||
        c.id.includes(search),
    );
  }, [search, commandes]);

  const total = (c: Commande) =>
    (c.commandesLigne ?? []).reduce(
      (s, l) => s + l.quantite * (l.prixUnitaire ?? 0),
      0,
    );

  const updateEtat = async (commandeId: string, etat: CommandeEtat) => {
    setUpdatingId(commandeId);
    try {
      await commandesApi.update(commandeId, { etat });
      await load();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <PageHeader icon="🧾" title="Commandes" subtitle={`${commandes.length} commande(s) trouvée(s)`}
        actions={
          <button className="btn-icon" onClick={() => navigate('/commandes/nouvelle')} id="btn-nouvelle-commande">
            ＋ Nouvelle commande
          </button>
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchInput placeholder="Rechercher par fournisseur, ID…" onSearch={setSearch} />

        <select className="field-select" style={{ width: 'auto', padding: '9px 14px' }}
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)} id="filter-type">
          <option value="">Tous les types</option>
          <option value="ACHAT">Achat</option>
          <option value="VENTE">Vente</option>
        </select>

        <select className="field-select" style={{ width: 'auto', padding: '9px 14px' }}
          value={etatFilter} onChange={e => setEtatFilter(e.target.value)} id="filter-etat">
          <option value="">Tous les états</option>
          <option value="EN_COURS">En cours</option>
          <option value="FERMEE">Fermée</option>
          <option value="LIVREE">Livrée</option>
          <option value="ANNULEE">Annulée</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🧾" title="Aucune commande" subtitle="Créez une commande d'achat pour commencer." />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Type</th><th>Fournisseur</th><th>Entrepôt</th><th>Total</th><th>État</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const et = ETAT_BADGE[c.etat] ?? { label: c.etat, variant: 'gray' };
                return (
                  <tr key={c.id} className="table-row">
                    <td><code style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 4 }}>{c.id.slice(0, 8)}…</code></td>
                    <td><Badge variant={c.type === 'ACHAT' ? 'blue' : 'purple'}>{c.type}</Badge></td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.fournisseur?.nom ?? '—'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{c.entrepot?.nom ?? '—'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{total(c).toFixed(2)} DT</td>
                    <td><Badge variant={et.variant}>{et.label}</Badge></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(c.dateCreation).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '5px 12px', fontSize: 12 }}
                          onClick={() => navigate(`/commandes/${c.id}`)}
                        >
                          👁 Détail
                        </button>
                        {c.etat === 'EN_COURS' && (
                          <button
                            className="btn-primary-sm"
                            style={{ padding: '5px 10px', fontSize: 12 }}
                            onClick={() => updateEtat(c.id, 'LIVREE')}
                            disabled={updatingId === c.id}
                          >
                            ✅ {c.type === 'ACHAT' ? 'Livrer' : 'Expédier'}
                          </button>
                        )}
                        {c.etat === 'EN_COURS' && (
                          <button
                            className="btn-danger"
                            style={{ padding: '5px 10px', fontSize: 12 }}
                            onClick={() => updateEtat(c.id, 'ANNULEE')}
                            disabled={updatingId === c.id}
                          >
                            ✖ Annuler
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
