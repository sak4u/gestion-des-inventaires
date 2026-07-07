import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { SearchInput, Badge, EmptyState, Spinner } from '../components/ui/index';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { produitsApi } from '../api/index';
import { Package, Plus, AlertTriangle, Eye, Edit2, Trash2, Info, Download } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Produit {
  id: string;
  nom: string;
  codeBare: string;
  category: string;
  prixAchatMoyen: number;
  prixVente: number;
  stockAlert: number;
  stockTotal?: number;
  createdAt: string;
}

interface ProduitForm {
  nom: string;
  codeBare: string;
  category: string;
  stockAlert: string;
  prixAchatMoyen: string;
  prixVente: string;
}

const EMPTY_FORM: ProduitForm = { nom: '', codeBare: '', category: '', stockAlert: '', prixAchatMoyen: '0', prixVente: '0' };

// ═══════════════════════════════════════════════════════════════════════════════
export default function ProduitsPage() {
  const navigate = useNavigate();
  const [produits, setProduits]     = useState<Produit[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [alertFilter, setAlertFilter] = useState<'all' | 'alert'>('all');
  const [showModal, setShowModal]   = useState(false);
  const [editTarget, setEditTarget] = useState<Produit | null>(null);
  const [form, setForm]             = useState<ProduitForm>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [error, setError]           = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await produitsApi.list();
      const data: Produit[] = res.data ?? [];
      setProduits(data);
    } catch { /* network error handled by interceptor */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = [...produits];
    if (search) {
      const needle = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.nom.toLowerCase().includes(needle) || p.codeBare.includes(search),
      );
    }
    if (catFilter) list = list.filter((p) => p.category === catFilter);
    if (alertFilter === 'alert') {
      list = list.filter((p) => (p.stockTotal ?? 0) <= p.stockAlert);
    }
    return list;
  }, [produits, search, catFilter, alertFilter]);

  const categories = [...new Set(produits.map(p => p.category).filter(Boolean))];

  // ── Modal helpers ──────────────────────────────────────────────────────────────
  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setError(''); setShowModal(true); };
  const openEdit   = (p: Produit) => {
    setEditTarget(p);
    setForm({
      nom: p.nom,
      codeBare: p.codeBare,
      category: p.category,
      stockAlert: String(p.stockAlert),
      prixAchatMoyen: String(p.prixAchatMoyen),
      prixVente: String(p.prixVente),
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim() || !form.codeBare.trim() || !form.category.trim()) {
      setError('Nom, code-barre et catégorie sont obligatoires.');
      return;
    }

    const stockAlertParsed = Number.parseInt(form.stockAlert, 10);
    if (!Number.isInteger(stockAlertParsed) || stockAlertParsed < 0) {
      setError("Le seuil d'alerte doit être un entier positif ou zéro.");
      return;
    }

    const payload: Record<string, unknown> = {
      nom: form.nom.trim(),
      codeBare: form.codeBare.trim(),
      category: form.category.trim(),
      stockAlert: stockAlertParsed,
      prixVente: Number.parseFloat(form.prixVente || '0'),
    };
    // prixAchatMoyen is CUMP — only set on creation (initial seed), never on update.
    // It is recalculated automatically by the backend on every ACHAT delivery.
    if (!editTarget) {
      payload.prixAchatMoyen = Number.parseFloat(form.prixAchatMoyen || '0');
    }

    setSaving(true); setError('');
    try {
      if (editTarget) await produitsApi.update(editTarget.id, payload);
      else await produitsApi.create(payload);
      setShowModal(false);
      await load();
    } catch (e: unknown) {
      const message =
        typeof e === 'object' &&
        e !== null &&
        'response' in e &&
        typeof (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message !==
          'undefined'
          ? (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : undefined;
      setError(
        Array.isArray(message)
          ? message.join(' — ')
          : (message ?? 'Erreur lors de la sauvegarde.'),
      );
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try { await produitsApi.delete(deleteId); await load(); }
    catch { /* handled */ }
    finally { setDeleting(false); setDeleteId(null); }
  };

  const stockStatus = (p: Produit) => {
    const s = p.stockTotal ?? 0;
    if (s <= 0)           return { label: 'Rupture',   cls: 'badge--red'    };
    if (s <= p.stockAlert) return { label: 'Alerte',    cls: 'badge--orange' };
    return                        { label: 'OK',        cls: 'badge--green'  };
  };

  const handleExportCsv = async () => {
    if (filtered.length === 0) return;
    const header = ['Nom', 'Code-barre', 'Catégorie', 'Prix Achat (Moyen)', 'Prix Vente', 'Stock Total', 'Seuil Alerte'];
    const escapeCsv = (str: any) => `"${String(str ?? '').replace(/"/g, '""')}"`;
    const rows = filtered.map(p => [
      escapeCsv(p.nom),
      escapeCsv(p.codeBare),
      escapeCsv(p.category),
      escapeCsv(p.prixAchatMoyen),
      escapeCsv(p.prixVente),
      escapeCsv(p.stockTotal ?? 0),
      escapeCsv(p.stockAlert)
    ]);
    const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    // Use Byte Order Mark (BOM) to ensure Excel reads UTF-8 correctly
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `export-produits-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        icon={<Package size={28} />}
        title="Produits"
        subtitle={`${produits.length} produit${produits.length !== 1 ? 's' : ''} enregistré${produits.length !== 1 ? 's' : ''}`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => void handleExportCsv()} id="btn-export-produits-csv">
              <Download size={14} /> Export CSV
            </button>
            <button className="btn-icon" onClick={openCreate} id="btn-nouveau-produit" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={18} /> Nouveau produit
            </button>
          </div>
        }
      />

      {/* ── Filters bar ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchInput placeholder="Rechercher par nom, code-barre…" onSearch={setSearch} />

        <select
          className="field-select"
          style={{ width: 'auto', padding: '9px 14px' }}
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          id="filter-categorie"
        >
          <option value="">Toutes les catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'alert'] as const).map(v => (
            <button
              key={v}
              onClick={() => setAlertFilter(v)}
              className={alertFilter === v ? 'btn-primary-sm' : 'btn-secondary'}
              style={{ padding: '7px 14px', fontSize: 13 }}
            >
              {v === 'all' ? 'Tous' : <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={14} /> En alerte</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Package size={48} />} title="Aucun produit trouvé" subtitle="Modifiez vos filtres ou créez un nouveau produit." />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Code-barre</th>
                <th>Catégorie</th>
                <th>Prix Achat (Moyen)</th>
                <th>Prix Vente</th>
                <th>Stock total</th>
                <th>Seuil alerte</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const st = stockStatus(p);
                return (
                  <tr key={p.id} className="table-row">
                    <td>
                      <span
                        style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
                        onClick={() => navigate(`/produits/${p.id}`)}
                      >
                        {p.nom}
                      </span>
                    </td>
                    <td><code style={{ fontSize: 12, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 4 }}>{p.codeBare}</code></td>
                    <td><Badge variant="blue">{p.category || '—'}</Badge></td>
                    <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{Number(p.prixAchatMoyen ?? 0).toFixed(2)} DT</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{Number(p.prixVente ?? 0).toFixed(2)} DT</td>
                    <td style={{ fontWeight: 700, fontSize: 15, color: (p.stockTotal ?? 0) <= p.stockAlert ? 'var(--error)' : 'var(--text-primary)' }}>
                      {p.stockTotal ?? '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.stockAlert}</td>
                    <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12, display: 'flex', alignItems: 'center' }}
                          onClick={() => navigate(`/produits/${p.id}`)} title="Voir détail"><Eye size={14} /></button>
                        <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12, display: 'flex', alignItems: 'center' }}
                          onClick={() => openEdit(p)} title="Modifier"><Edit2 size={14} /></button>
                        <button className="btn-danger" style={{ padding: '5px 12px', fontSize: 12, display: 'flex', alignItems: 'center' }}
                          onClick={() => setDeleteId(p.id)} title="Supprimer"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create/Edit Modal ─────────────────────────────────────── */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? `Modifier — ${editTarget.nom}` : 'Nouveau produit'}
        size="md"
      >
        {error && <div className="alert alert-error" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={18} /> {error}</div>}

        <div className="field-group">
          <label className="field-label">Nom du produit *</label>
          <input className="field-input" id="produit-nom" name="nom" value={form.nom}
            onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Imprimante HP LaserJet" />
        </div>
        <div className="field-group">
          <label className="field-label">Code-barre *</label>
          <input className="field-input" id="produit-codebare" name="codeBare" value={form.codeBare}
            onChange={e => setForm(f => ({ ...f, codeBare: e.target.value }))} placeholder="Ex: 8691234567890" />
        </div>
        <div className="field-group">
          <label className="field-label">Catégorie</label>
          <input className="field-input" id="produit-category" name="category" value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ex: Électronique, Bureautique…" />
        </div>
        <div className="field-group">
          <label className="field-label">Seuil d'alerte stock</label>
          <input className="field-input" id="produit-stockalert" name="stockAlert" type="number" min={0} value={form.stockAlert}
            onChange={e => setForm(f => ({ ...f, stockAlert: e.target.value }))} placeholder="Ex: 10" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="field-group">
            <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Prix d'Achat Moyen (CUMP)
              <span style={{ fontSize: 10, background: 'rgba(59,130,246,0.15)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 4, fontWeight: 500 }}>
                {editTarget ? 'AUTO' : 'Initial'}
              </span>
            </label>
            <input
              className="field-input"
              id="produit-prixachatmoyen"
              name="prixAchatMoyen"
              type="number" min={0} step="0.01"
              value={form.prixAchatMoyen}
              onChange={e => setForm(f => ({ ...f, prixAchatMoyen: e.target.value }))}
              placeholder="0.00"
              readOnly={!!editTarget}
              title={editTarget ? 'Calculé automatiquement lors des réceptions d\'achat (CUMP)' : 'Prix d\'achat initial'}
              style={editTarget ? { opacity: 0.5, cursor: 'not-allowed', background: 'rgba(255,255,255,0.03)' } : {}}
            />
            {editTarget && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Info size={14} /> Mis à jour automatiquement à chaque réception d'achat
              </span>
            )}
          </div>
          <div className="field-group">
            <label className="field-label">Prix de Vente *</label>
            <input className="field-input" id="produit-prixvente" name="prixVente" type="number" min={0} step="0.01" value={form.prixVente}
              onChange={e => setForm(f => ({ ...f, prixVente: e.target.value }))} placeholder="0.00" />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Annuler</button>
          <button className="btn-primary-sm" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size={16} /> : editTarget ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </Modal>

      {/* ── Confirm Delete ────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer le produit"
        message="Cette action est irréversible. Le produit et tous ses mouvements de stock associés seront supprimés."
        confirmLabel="Supprimer"
        danger
        loading={deleting}
      />
    </div>
  );
}
