import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { EmptyState, Spinner, SearchInput } from '../components/ui/index';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { fournisseursApi } from '../api/index';
import { Handshake, Eye, Edit2, Mail, Trash2, AlertTriangle, Plus } from 'lucide-react';

interface Fournisseur {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  fournisseurProduits?: unknown[];
  createdAt: string;
}
interface FourForm { nom: string; email: string; telephone: string; adresse: string; }
const EMPTY: FourForm = { nom: '', email: '', telephone: '', adresse: '' };

export default function FournisseursPage() {
  const navigate = useNavigate();
  const [list, setList]           = useState<Fournisseur[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Fournisseur | null>(null);
  const [form, setForm]           = useState<FourForm>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [deleting, setDeleting]   = useState(false);
  const [error, setError]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fournisseursApi.list();
      setList(res.data ?? []);
    }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search) return list;
    const needle = search.toLowerCase();
    return list.filter(
      (f) =>
        f.nom.toLowerCase().includes(needle) ||
        (f.email?.toLowerCase().includes(needle) ?? false),
    );
  }, [list, search]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY); setError(''); setShowModal(true); };
  const openEdit   = (f: Fournisseur) => { setEditTarget(f); setForm({ nom: f.nom, email: f.email ?? '', telephone: f.telephone ?? '', adresse: f.adresse ?? '' }); setError(''); setShowModal(true); };

  const handleSave = async () => {
    if (!form.nom.trim()) { setError('Le nom est obligatoire.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        nom: form.nom.trim(),
        email: form.email.trim() || undefined,
        telephone: form.telephone.trim() || undefined,
        adresse: form.adresse.trim() || undefined,
      };
      if (editTarget) await fournisseursApi.update(editTarget.id, payload);
      else            await fournisseursApi.create(payload);
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
    try { await fournisseursApi.delete(deleteId); await load(); }
    finally { setDeleting(false); setDeleteId(null); }
  };

  return (
    <div>
      <PageHeader icon={<Handshake size={28} />} title="Fournisseurs" subtitle={`${list.length} fournisseur(s) référencé(s)`}
        actions={<button className="btn-icon" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={openCreate} id="btn-nouveau-fournisseur"><Plus size={16} /> Nouveau fournisseur</button>}
      />

      <div style={{ marginBottom: 20 }}>
        <SearchInput placeholder="Rechercher par nom, email…" onSearch={setSearch} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Handshake size={48} />} title="Aucun fournisseur" subtitle="Ajoutez votre premier fournisseur." />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Produits liés</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} className="table-row">
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.nom}</td>
                  <td>
                    {f.email
                      ? <a href={`mailto:${f.email}`} style={{ color: 'var(--accent-light)', textDecoration: 'none', fontSize: 13 }}>{f.email}</a>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{f.telephone ?? '—'}</td>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent-light)' }}>{f.fournisseurProduits?.length ?? 0}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> produit(s)</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => navigate(`/fournisseurs/${f.id}`)}><Eye size={14} /></button>
                      <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => openEdit(f)}><Edit2 size={14} /></button>
                      {f.email && (
                        <a href={`mailto:${f.email}`} className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="Envoyer email"><Mail size={14} /></a>
                      )}
                      <button className="btn-danger" style={{ padding: '5px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDeleteId(f.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTarget ? `Modifier — ${editTarget.nom}` : 'Nouveau fournisseur'} size="md">
        {error && <div className="alert alert-error" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={18} /> {error}</div>}
        {(['nom', 'email', 'telephone', 'adresse'] as (keyof FourForm)[]).map(k => (
          <div key={k} className="field-group">
            <label className="field-label">{k.charAt(0).toUpperCase() + k.slice(1)}{k === 'nom' ? ' *' : ''}</label>
            <input className="field-input" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
              placeholder={k === 'nom' ? 'Ex: Société Fournitures SA' : k === 'email' ? 'contact@fournisseur.com' : k === 'telephone' ? '+216 20 000 000' : '12 Rue Commerce, Tunis'} />
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Annuler</button>
          <button className="btn-primary-sm" onClick={handleSave} disabled={saving}>{saving ? <Spinner size={16} /> : editTarget ? 'Mettre à jour' : 'Créer'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Supprimer le fournisseur" message="Ce fournisseur sera retiré du système. Les commandes et associations de prix resteront en base."
        confirmLabel="Supprimer" danger loading={deleting} />
    </div>
  );
}
