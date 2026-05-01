import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/layout/PageHeader';
import { EmptyState, Spinner, Badge } from '../components/ui/index';
import Modal from '../components/ui/Modal';
import { propositionsApi, entrepotsApi } from '../api/index';

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string,string> = {};
      if (statutFilter) params.statut = statutFilter;
      const res = await propositionsApi.list(params);
      setProps(res.data ?? []);
    } finally { setLoading(false); }
  }, [statutFilter]);

  useEffect(() => { load(); }, [load]);

  const openAccept = async (p: any) => {
    setAcceptModal(p); setEntrepotId(''); setError('');
    const res = await entrepotsApi.list();
    setEntrepots(res.data ?? []);
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
      <PageHeader icon="🤖" title="Propositions IA" subtitle="Suggestions de réapprovisionnement générées automatiquement" />

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['', 'Toutes'], ['EN_ATTENTE', '⏳ En attente'], ['ACCEPTEE', '✅ Acceptées'], ['REFUSEE', '❌ Refusées']].map(([v, l]) => (
          <button key={v} onClick={() => setStatut(v)}
            className={statutFilter === v ? 'btn-primary-sm' : 'btn-secondary'}
            style={{ padding: '7px 14px', fontSize: 13 }}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : props.length === 0 ? (
        <EmptyState icon="🤖" title="Aucune proposition" subtitle="L'IA génère des propositions lors des analyses de stock." />
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
                          <button className="btn-primary-sm" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => openAccept(p)}>✅ Accepter</button>
                          <button className="btn-danger" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => handleRefuse(p.id)}>❌ Refuser</button>
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
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
          Accepter cette proposition créera automatiquement une commande de <strong style={{ color: 'var(--text-primary)' }}>{acceptModal?.quantiteProposee}</strong> unités de <strong style={{ color: 'var(--text-primary)' }}>{acceptModal?.produit?.nom}</strong> auprès de <strong style={{ color: 'var(--text-primary)' }}>{acceptModal?.fournisseur?.nom}</strong>.
        </p>
        <div className="field-group">
          <label className="field-label">Entrepôt de destination *</label>
          <select className="field-select" value={entrepotId} onChange={e => setEntrepotId(e.target.value)}>
            <option value="">Sélectionner un entrepôt…</option>
            {entrepots.map((e: any) => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button className="btn-secondary" onClick={() => setAcceptModal(null)} disabled={acting}>Annuler</button>
          <button className="btn-primary-sm" onClick={handleAccept} disabled={acting}>{acting ? <Spinner size={16} /> : '✅ Confirmer'}</button>
        </div>
      </Modal>
    </div>
  );
}
