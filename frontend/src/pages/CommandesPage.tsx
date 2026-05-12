import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Receipt, Camera, Eye, Check, X, Plus } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { EmptyState, Spinner, SearchInput, Badge, BarcodeScanner } from '../components/ui/index';
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
  const location = useLocation();
  const state = location.state as { typeFilter?: string; etatFilter?: string; openScanner?: boolean } | null;

  const [typeFilter, setTypeFilter] = useState(state?.typeFilter ?? '');
  const [etatFilter, setEtatFilter] = useState(state?.etatFilter ?? '');
  const [search, setSearch]         = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [showScanner, setShowScanner] = useState(state?.openScanner ?? false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Clear scanner state to prevent reopening loops
  useEffect(() => {
    if (state?.openScanner) {
      window.history.replaceState({}, '');
    }
  }, [state]);

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
    let result = commandes;

    if (scannedCode) {
      const needle = scannedCode.toLowerCase();
      result = result.filter(c => 
        (c.commandesLigne ?? []).some(l => 
          (l as any).produit?.codeBare?.toLowerCase() === needle
        )
      );
    }

    if (search) {
      const needle = search.toLowerCase();
      result = result.filter(
        (c) =>
          (c.fournisseur?.nom?.toLowerCase().includes(needle) ?? false) ||
          c.id.toLowerCase().includes(needle) ||
          (c.commandesLigne ?? []).some(l => 
            (l as any).produit?.nom?.toLowerCase().includes(needle) ||
            (l as any).produit?.codeBare?.toLowerCase().includes(needle)
          )
      );
    }
    return result;
  }, [search, scannedCode, commandes]);

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
      <PageHeader icon={<Receipt size={28} />} title="Commandes" subtitle={`${commandes.length} commande(s) trouvée(s)`}
        actions={
          <button className="btn-icon" onClick={() => navigate('/commandes/nouvelle')} id="btn-nouvelle-commande" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={18} /> Nouvelle commande
          </button>
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <SearchInput placeholder="Fournisseur, Produit, ID…" onSearch={(val) => { setSearch(val); if(!val) setScannedCode(''); }} />
          <button className="btn-secondary" onClick={() => setShowScanner(true)} title="Scanner un produit" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Camera size={16} /> Scanner
          </button>
        </div>

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
        <EmptyState icon={<Receipt size={48} />} title="Aucune commande" subtitle="Créez une commande d'achat pour commencer." />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Type</th><th>Fournisseur</th><th>Entrepôt</th><th>Total</th><th>État</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const et = ETAT_BADGE[c.etat] ?? { label: c.etat, variant: 'gray' };
                return (
                  <tr key={c.id} className="table-row">
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
                          style={{ padding: '5px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={() => navigate(`/commandes/${c.id}`)}
                        >
                          <Eye size={14} /> Détail
                        </button>
                        {c.etat === 'EN_COURS' && (
                          <button
                            className="btn-primary-sm"
                            style={{ padding: '5px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => updateEtat(c.id, 'LIVREE')}
                            disabled={updatingId === c.id}
                          >
                            <Check size={14} /> {c.type === 'ACHAT' ? 'Livrer' : 'Expédier'}
                          </button>
                        )}
                        {c.etat === 'EN_COURS' && (
                          <button
                            className="btn-danger"
                            style={{ padding: '5px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => updateEtat(c.id, 'ANNULEE')}
                            disabled={updatingId === c.id}
                          >
                            <X size={14} /> Annuler
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

      <BarcodeScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(code) => { setScannedCode(code); setShowScanner(false); }}
        title="Scanner le produit recu"
      />
    </div>
  );
}
