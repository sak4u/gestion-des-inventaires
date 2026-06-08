import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/layout/PageHeader';
import { EmptyState, Spinner, Badge, SearchInput } from '../components/ui/index';
import Modal from '../components/ui/Modal';
import { propositionsApi, entrepotsApi, produitsApi, fournisseursApi } from '../api/index';
import { Bot, Check, X, AlertTriangle } from 'lucide-react';

const STATUT_BADGE: Record<string, { label: string; v: 'orange' | 'green' | 'red' }> = {
  EN_ATTENTE: { label: 'En attente', v: 'orange' },
  ACCEPTEE:   { label: 'Acceptée',   v: 'green'  },
  REFUSEE:    { label: 'Refusée',    v: 'red'    },
};

export default function PropositionsPage() {
  const [props, setProps]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [statutFilter, setStatut]   = useState('');
  const [acceptModal, setAcceptModal] = useState<any | null>(null);
  const [entrepotId, setEntrepotId] = useState('');
  const [entrepots, setEntrepots]   = useState<any[]>([]);
  const [acting, setActing]         = useState(false);
  const [error, setError]           = useState('');
  const [statuts, setStatuts]       = useState<string[]>([]);
  const [search, setSearch]         = useState('');
  const [pId, setPId]               = useState('');
  const [fId, setFId]               = useState('');
  const [cEtat, setCEtat]           = useState('');
  const [resetKey, setResetKey]     = useState(0);
  const [allProduits, setAllProduits] = useState<any[]>([]);
  const [allFournisseurs, setAllFournisseurs] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string,string> = {};
      if (statutFilter) params.statut = statutFilter;
      if (search) params.search = search;
      if (pId) params.produitId = pId;
      if (fId) params.fournisseurId = fId;
      if (cEtat) params.commandeEtat = cEtat;
      const res = await propositionsApi.list(params);
      setProps(res.data ?? []);
    } finally { setLoading(false); }
  }, [statutFilter, search, pId, fId, cEtat]);

  const resetFilters = () => {
    setStatut('');
    setSearch('');
    setPId('');
    setFId('');
    setCEtat('');
    setResetKey(prev => prev + 1);
  };

  useEffect(() => { load(); }, [load]);

  // Load enums and filter lists on mount
  useEffect(() => {
    console.log('Loading enums...');
    propositionsApi.enums()
      .then((res) => {
        console.log('Enums loaded:', res.data);
        setStatuts(res.data?.statuts ?? []);
      })
      .catch((err) => {
        console.error('Failed to load enums:', err);
      });
    
    produitsApi.list().then(res => setAllProduits(res.data ?? [])).catch(() => {});
    fournisseursApi.list().then(res => setAllFournisseurs(res.data ?? [])).catch(() => {});
  }, []);

  const openAccept = async (p: any) => {
    setAcceptModal(p); setEntrepotId(''); setError('');
    const res = await entrepotsApi.list();
    setEntrepots(res.data ?? []);
  };

  /** Calcule le taux de remplissage d'un entrepôt (0–100). Retourne null si pas de capaciteMax. */
  const getRemplissage = (e: any): number | null => {
    if (!e.capaciteMax || e.capaciteMax <= 0) return null;
    const stock = e.stockTotalEntrepot ?? e.stockEntrepots?.reduce((s: number, se: any) => s + se.quantite, 0) ?? 0;
    return Math.min((stock / e.capaciteMax) * 100, 100);
  };

  const handleAccept = async () => {
    if (!entrepotId) { setError("Veuillez sélectionner un entrepôt de destination."); return; }
    setActing(true);
    try { await propositionsApi.accept(acceptModal.id, entrepotId); setAcceptModal(null); await load(); }
    catch (e: any) { setError(e?.response?.data?.message ?? 'Erreur.'); }
    finally { setActing(false); }
  };

  const handleRefuse = async (id: string) => {
    try { await propositionsApi.refuse(id); await load(); }
    catch { /* handled */ }
  };

  return (
    <div>
      <PageHeader icon={<Bot size={28} />} title="Propositions IA" subtitle="Suggestions de réapprovisionnement générées automatiquement" />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: 300 }}>
          <SearchInput
            key={resetKey}
            placeholder="Rechercher produit ou fournisseur..."
            onSearch={(v) => setSearch(v)}
          />
        </div>

        <select
          className="field-select"
          style={{ width: 'auto', padding: '9px 14px' }}
          value={pId}
          onChange={e => setPId(e.target.value)}
        >
          <option value="">Tous les produits</option>
          {allProduits.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </select>

        <select
          className="field-select"
          style={{ width: 'auto', padding: '9px 14px' }}
          value={fId}
          onChange={e => setFId(e.target.value)}
        >
          <option value="">Tous les fournisseurs</option>
          {allFournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
        </select>

        <select
          className="field-select"
          style={{ width: 'auto', padding: '9px 14px' }}
          value={cEtat}
          onChange={e => setCEtat(e.target.value)}
        >
          <option value="">État commande (tous)</option>
          <option value="EN_COURS">EN_COURS</option>
          <option value="LIVREE">LIVREE</option>
          <option value="FERMEE">FERMEE</option>
          <option value="ANNULEE">ANNULEE</option>
        </select>

        <select
          className="field-select"
          style={{ width: 'auto', padding: '9px 14px' }}
          value={statutFilter}
          onChange={e => setStatut(e.target.value)}
        >
          <option value="">Statut proposition (tous)</option>
          {statuts.map(s => (
            <option key={s} value={s}>{STATUT_BADGE[s]?.label ?? s}</option>
          ))}
        </select>

        <button 
          className="btn-secondary" 
          onClick={resetFilters}
          style={{ padding: '9px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <X size={16} /> Réinitialiser
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : props.length === 0 ? (
        <EmptyState icon={<Bot size={48} />} title="Aucune proposition" subtitle="L'IA génère des propositions lors des analyses de stock." />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Produit</th><th>Fournisseur</th><th>Qté proposée</th><th>Score four.</th><th>CMJ</th><th>Fiabilité</th><th>Statut</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {props.map((p: any) => {
                const s = STATUT_BADGE[p.statut] ?? { label: p.statut, v: 'gray' };
                return (
                  <tr key={p.id} className="table-row">
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.produit?.nom ?? '—'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{p.fournisseur?.nom ?? '—'}</td>
                    <td style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent-light)' }}>{p.quantiteProposee}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, color: p.scoreFournisseur > 0.7 ? 'var(--success)' : 'var(--warning)' }}>
                          {(p.scoreFournisseur * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.prediction?.CMJ?.toFixed(2) ?? '—'} u/j</td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 700, color: (p.prediction?.fiabilite ?? 0) > 0.7 ? 'var(--success)' : 'var(--warning)' }}>
                        {((p.prediction?.fiabilite ?? 0) * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td><Badge variant={s.v as any}>{s.label}</Badge></td>
                    <td>
                      {p.statut === 'EN_ATTENTE' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-primary-sm" style={{ padding: '5px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => openAccept(p)}><Check size={14} /> Accepter</button>
                          <button className="btn-danger" style={{ padding: '5px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => handleRefuse(p.id)}><X size={14} /> Refuser</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!acceptModal} onClose={() => setAcceptModal(null)} title="Accepter la proposition" size="sm">
        {error && <div className="alert alert-error" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={18} /> {error}</div>}
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
          Accepter cette proposition créera automatiquement une commande de <strong style={{ color: 'var(--text-primary)' }}>{acceptModal?.quantiteProposee}</strong> unités de <strong style={{ color: 'var(--text-primary)' }}>{acceptModal?.produit?.nom}</strong> auprès de <strong style={{ color: 'var(--text-primary)' }}>{acceptModal?.fournisseur?.nom}</strong>.
        </p>
        <div className="field-group">
          <label className="field-label">Entrepôt de destination *</label>
          {(() => {
            const available = entrepots.filter((e: any) => {
              const r = getRemplissage(e);
              return r === null || r < 90;
            });
            const allFull = entrepots.length > 0 && available.length === 0;
            return (
              <>
                {allFull && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#f87171' }}>
                    <AlertTriangle size={16} />
                    Tous les entrepôts sont pleins (≥ 90%). Veuillez libérer de l'espace avant d'accepter.
                  </div>
                )}
                <select
                  className="field-select"
                  value={entrepotId}
                  onChange={e => setEntrepotId(e.target.value)}
                  disabled={allFull}
                >
                  <option value="">Sélectionner un entrepôt…</option>
                  {entrepots.map((e: any) => {
                    const r = getRemplissage(e);
                    const isFull = r !== null && r >= 90;
                    const isWarn = r !== null && r >= 70 && r < 90;
                    const label = r !== null
                      ? `${e.nom} ${isFull ? '🔴 Plein' : isWarn ? `⚠️ ${r.toFixed(0)}% utilisé` : `✅ ${r.toFixed(0)}% utilisé`}`
                      : `${e.nom} (capacité illimitée)`;
                    return (
                      <option key={e.id} value={e.id} disabled={isFull}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                {entrepotId && (() => {
                  const sel = entrepots.find((e: any) => e.id === entrepotId);
                  const r = sel ? getRemplissage(sel) : null;
                  if (r !== null && r >= 70) {
                    return (
                      <p style={{ marginTop: 8, fontSize: 12, color: '#fb923c', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={13} /> Cet entrepôt est à {r.toFixed(0)}% de sa capacité — choisissez-en un autre si possible.
                      </p>
                    );
                  }
                  return null;
                })()}
              </>
            );
          })()}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button className="btn-secondary" onClick={() => setAcceptModal(null)} disabled={acting}>Annuler</button>
          <button className="btn-primary-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={handleAccept} disabled={acting}>{acting ? <Spinner size={16} /> : <><Check size={16} /> Confirmer</>}</button>
        </div>
      </Modal>
    </div>
  );
}
