import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { EmptyState, Spinner } from '../components/ui/index';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { entrepotsApi } from '../api/index';

interface EntrepotStockItem {
  quantite: number;
}
interface Entrepot {
  id: string;
  nom: string;
  adresse?: string;
  capaciteMax?: number;
  stockEntrepots?: EntrepotStockItem[];
  createdAt: string;
}
interface EntrepotForm { nom: string; adresse: string; capaciteMax: string; }
const EMPTY: EntrepotForm = { nom: '', adresse: '', capaciteMax: '' };

export default function EntrepotsPage() {
  const navigate = useNavigate();
  const [entrepots, setEntrepots] = useState<Entrepot[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Entrepot | null>(null);
  const [form, setForm]           = useState<EntrepotForm>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [deleting, setDeleting]   = useState(false);
  const [error, setError]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await entrepotsApi.list(); setEntrepots(res.data ?? []); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY); setError(''); setShowModal(true); };
  const openEdit   = (e: Entrepot) => {
    setEditTarget(e);
    setForm({ nom: e.nom, adresse: e.adresse ?? '', capaciteMax: String(e.capaciteMax ?? '') });
    setError(''); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim()) { setError('Le nom est obligatoire.'); return; }
    if (form.capaciteMax && (!Number.isInteger(Number(form.capaciteMax)) || Number(form.capaciteMax) < 0)) {
      setError('La capacité maximale doit être un entier positif ou zéro.');
      return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        nom: form.nom.trim(),
        adresse: form.adresse.trim() || undefined,
        capaciteMax: form.capaciteMax ? Number.parseInt(form.capaciteMax, 10) : undefined,
      };
      if (editTarget) await entrepotsApi.update(editTarget.id, payload);
      else            await entrepotsApi.create(payload);
      setShowModal(false); await load();
    } catch (e: unknown) {
      const message =
        typeof e === 'object' &&
        e !== null &&
        'response' in e &&
        typeof (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message !==
          'undefined'
          ? (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : undefined;
      setError(Array.isArray(message) ? message.join(' — ') : (message ?? 'Erreur.'));
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return; setDeleting(true);
    try { await entrepotsApi.delete(deleteId); await load(); }
    finally { setDeleting(false); setDeleteId(null); }
  };

  const stockCount = (e: Entrepot) =>
    (e.stockEntrepots ?? []).reduce((s, se) => s + se.quantite, 0);
  const fillPct    = (e: Entrepot) => e.capaciteMax ? Math.min(100, Math.round((stockCount(e) / e.capaciteMax) * 100)) : null;

  return (
    <div>
      <PageHeader icon="🏭" title="Entrepôts" subtitle={`${entrepots.length} entrepôt(s) configuré(s)`}
        actions={<button className="btn-icon" onClick={openCreate} id="btn-nouvel-entrepot">＋ Nouvel entrepôt</button>}
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : entrepots.length === 0 ? (
        <EmptyState icon="🏭" title="Aucun entrepôt" subtitle="Créez votre premier entrepôt pour commencer." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
          {entrepots.map(e => {
            const pct = fillPct(e);
            return (
              <div key={e.id} className="chart-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>{e.nom}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.adresse ?? 'Adresse non renseignée'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => navigate(`/entrepots/${e.id}`)} title="Voir stock">👁</button>
                    <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => openEdit(e)} title="Modifier">✏️</button>
                    <button className="btn-danger"    style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setDeleteId(e.id)} title="Supprimer">🗑</button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 20 }}>
                  <div><p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>STOCK TOTAL</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{stockCount(e)}</p></div>
                  {e.capaciteMax && (
                    <div><p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>CAPACITÉ MAX</p>
                      <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-secondary)' }}>{e.capaciteMax}</p></div>
                  )}
                </div>

                {pct !== null && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Taux de remplissage</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: pct > 80 ? 'var(--error)' : pct > 60 ? 'var(--warning)' : 'var(--success)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 7, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: pct > 80 ? 'var(--error)' : pct > 60 ? 'var(--warning)' : 'var(--success)', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTarget ? `Modifier — ${editTarget.nom}` : 'Nouvel entrepôt'} size="sm">
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
        <div className="field-group"><label className="field-label">Nom *</label>
          <input className="field-input" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Entrepôt Central" /></div>
        <div className="field-group"><label className="field-label">Adresse</label>
          <input className="field-input" value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} placeholder="Ex: 12 Rue de la Logistique, Tunis" /></div>
        <div className="field-group"><label className="field-label">Capacité maximale</label>
          <input className="field-input" type="number" min={0} value={form.capaciteMax} onChange={e => setForm(f => ({ ...f, capaciteMax: e.target.value }))} placeholder="Ex: 1000" /></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Annuler</button>
          <button className="btn-primary-sm" onClick={handleSave} disabled={saving}>{saving ? <Spinner size={16} /> : editTarget ? 'Mettre à jour' : 'Créer'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Supprimer l'entrepôt" message="Tous les stocks associés à cet entrepôt seront également supprimés. Cette action est irréversible."
        confirmLabel="Supprimer" danger loading={deleting} />
    </div>
  );
}
