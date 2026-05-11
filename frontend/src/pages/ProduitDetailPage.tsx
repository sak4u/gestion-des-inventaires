import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { produitsApi, fournisseurProduitApi, fournisseursApi } from '../api/index';
import { Spinner, EmptyState } from '../components/ui/index';
import PageHeader from '../components/layout/PageHeader';

const FLUX_COLORS: Record<string, string> = {
  achat: '#10b981', vente: '#3b82f6', perte: '#ef4444',
  retour: '#f59e0b', correction_inventaire: '#8b5cf6', transfert: '#06b6d4',
};

type FluxType =
  | 'achat'
  | 'vente'
  | 'perte'
  | 'retour'
  | 'correction_inventaire'
  | 'transfert';

interface ProduitStockEntrepot {
  id: string;
  quantite: number;
  entrepot?: { nom?: string };
}

interface ProduitFournisseur {
  id: string;
  prixAchat?: number | null;
  delaiLivraison?: number | null;
  fournisseurId?: string;
  fournisseur?: { id?: string; nom?: string };
}

interface ProduitFlux {
  id: string;
  date: string;
  type: FluxType;
  quantite: number;
  note?: string | null;
  entrepot?: { nom?: string };
  creerPar?: { name?: string };
}

interface ProduitDetail {
  id: string;
  nom: string;
  codeBare: string;
  category: string;
  prixAchatMoyen?: number | null;
  prixVente?: number | null;
  stockAlert: number;
  stockEntrepots?: ProduitStockEntrepot[];
  fournisseurProduits?: ProduitFournisseur[];
  fluxDeStocks?: ProduitFlux[];
}

interface FournisseurOption {
  id: string;
  nom: string;
}

export default function ProduitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [produit, setProduit] = useState<ProduitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [fournisseursOptions, setFournisseursOptions] = useState<FournisseurOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState<ProduitFournisseur | null>(null);
  const [deleteLinkId, setDeleteLinkId] = useState<string | null>(null);
  const [savingLink, setSavingLink] = useState(false);
  const [deletingLink, setDeletingLink] = useState(false);
  const [formError, setFormError] = useState('');
  const [linkForm, setLinkForm] = useState({
    fournisseurId: '',
    prixAchat: '',
    delaiLivraison: '',
  });

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [pRes, fournisseursRes] = await Promise.all([
          produitsApi.get(id),
          fournisseursApi.list(),
        ]);
        setProduit(pRes.data as ProduitDetail);
        setFournisseursOptions((fournisseursRes.data ?? []) as FournisseurOption[]);
      } finally { setLoading(false); }
    };
    void load();
  }, [id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={40} /></div>;
  if (!produit) return <EmptyState icon="❓" title="Produit introuvable" subtitle="Ce produit n'existe pas ou a été supprimé." />;

  const stocks = produit.stockEntrepots ?? [];
  const flux = (produit.fluxDeStocks ?? []).slice(0, 20);
  const stockTotal = stocks.reduce((s, se) => s + se.quantite, 0);
  const prixAchatMoyen = produit.prixAchatMoyen ?? 0;
  const prixVente = produit.prixVente ?? 0;
  const enAlerte = stockTotal <= produit.stockAlert;

  const openCreateLink = () => {
    setEditingLink(null);
    setFormError('');
    setLinkForm({ fournisseurId: '', prixAchat: '', delaiLivraison: '' });
    setShowModal(true);
  };

  const openEditLink = (link: ProduitFournisseur) => {
    setEditingLink(link);
    setFormError('');
    setLinkForm({
      fournisseurId: link.fournisseurId ?? link.fournisseur?.id ?? '',
      prixAchat: typeof link.prixAchat === 'number' ? String(link.prixAchat) : '',
      delaiLivraison: typeof link.delaiLivraison === 'number' ? String(link.delaiLivraison) : '',
    });
    setShowModal(true);
  };

  const refreshProduit = async () => {
    if (!id) return;
    setCatalogueLoading(true);
    try {
      const pRes = await produitsApi.get(id);
      setProduit(pRes.data as ProduitDetail);
    } finally {
      setCatalogueLoading(false);
    }
  };

  const saveLink = async () => {
    if (!id) return;
    if (!linkForm.fournisseurId) {
      setFormError('Veuillez sélectionner un fournisseur.');
      return;
    }
    if (linkForm.prixAchat && Number(linkForm.prixAchat) < 0) {
      setFormError("Le prix d'achat doit être positif.");
      return;
    }
    if (linkForm.delaiLivraison && Number(linkForm.delaiLivraison) < 0) {
      setFormError('Le délai de livraison doit être positif.');
      return;
    }

    setSavingLink(true);
    setFormError('');
    try {
      const payload = {
        produitId: id,
        fournisseurId: linkForm.fournisseurId,
        prixAchat: linkForm.prixAchat ? Number(linkForm.prixAchat) : undefined,
        delaiLivraison: linkForm.delaiLivraison ? Number.parseInt(linkForm.delaiLivraison, 10) : undefined,
      };
      if (editingLink) await fournisseurProduitApi.update(editingLink.id, payload);
      else await fournisseurProduitApi.create(payload);
      setShowModal(false);
      await refreshProduit();
    } catch (e: unknown) {
      const message =
        typeof e === 'object' &&
        e !== null &&
        'response' in e &&
        typeof (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message !==
          'undefined'
          ? (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : undefined;
      setFormError(Array.isArray(message) ? message.join(' — ') : (message ?? 'Erreur lors de la sauvegarde.'));
    } finally {
      setSavingLink(false);
    }
  };

  const deleteLink = async () => {
    if (!deleteLinkId) return;
    setDeletingLink(true);
    try {
      await fournisseurProduitApi.delete(deleteLinkId);
      await refreshProduit();
    } finally {
      setDeletingLink(false);
      setDeleteLinkId(null);
    }
  };

  return (
    <div>
      <PageHeader
        icon="📦"
        title={produit.nom}
        subtitle={`Code-barre: ${produit.codeBare} · Catégorie: ${produit.category}`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-icon" onClick={openCreateLink}>＋ Associer fournisseur</button>
            <button className="btn-secondary" onClick={() => navigate('/produits')}>← Retour</button>
          </div>
        }
      />

      {/* ── KPI row ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Stock total',     value: stockTotal,                           color: enAlerte ? '#ef4444' : '#10b981' },
          { label: 'Prix Achat (CUMP)', value: `${prixAchatMoyen.toFixed(2)} DT`, color: '#3b82f6' },
          { label: 'Prix de Vente',    value: `${prixVente.toFixed(2)} DT`,        color: '#10b981' },
          { label: 'Valeur stock (Cost)', value: `${(stockTotal * prixAchatMoyen).toFixed(2)} DT`, color: '#8b5cf6' },
        ].map(k => (
          <div key={k.label} className="kpi-card kpi-card--blue" style={{ borderLeftColor: k.color }}>
            <div>
              <p className="kpi-label">{k.label}</p>
              <p className="kpi-value" style={{ fontSize: 22, color: k.color }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {enAlerte && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          ⚠️ Stock critique : {stockTotal} unité(s) restante(s) — seuil d'alerte à {produit.stockAlert}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Stock par entrepôt */}
        <div className="chart-card">
          <p className="chart-title">🏭 Stock par entrepôt</p>
          {stocks.length === 0 ? (
            <EmptyState icon="📭" title="Aucun stock enregistré" />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Entrepôt', 'Quantité', 'Valeur'].map(h => (
                    <th key={h} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 10px', textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stocks.map((se) => {
                  const pct = produit.stockAlert > 0 ? Math.min(100, (se.quantite / produit.stockAlert) * 50) : 100;
                  return (
                    <tr key={se.id} style={{ borderTop: '1px solid rgba(59,130,246,0.06)' }}>
                      <td style={{ padding: '10px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {se.entrepot?.nom ?? '—'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: se.quantite <= produit.stockAlert ? 'var(--error)' : 'var(--success)' }}>
                            {se.quantite}
                          </span>
                          <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: se.quantite <= produit.stockAlert ? 'var(--error)' : 'var(--success)', borderRadius: 3 }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px', fontSize: 13, color: 'var(--text-muted)' }}>
                        {(se.quantite * prixAchatMoyen).toFixed(2)} DT
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Fournisseurs liés */}
        <div className="chart-card">
          <p className="chart-title">🤝 Fournisseurs associés</p>
          {catalogueLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><Spinner size={26} /></div>
          ) : !produit.fournisseurProduits?.length ? (
            <EmptyState icon="📭" title="Aucun fournisseur lié" />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Fournisseur', "Prix d'achat", 'Délai', 'Actions'].map(h => (
                    <th key={h} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 10px', textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {produit.fournisseurProduits.map((fp) => (
                  <tr key={fp.id} style={{ borderTop: '1px solid rgba(59,130,246,0.06)' }}>
                    <td style={{ padding: '10px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{fp.fournisseur?.nom ?? '—'}</td>
                    <td style={{ padding: '10px', fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>{(fp.prixAchat ?? 0).toFixed(2)} DT</td>
                    <td style={{ padding: '10px', fontSize: 13, color: 'var(--text-muted)' }}>{fp.delaiLivraison ?? '—'} j</td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => openEditLink(fp)}>✏️</button>
                        <button className="btn-danger" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setDeleteLinkId(fp.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Historique flux */}
      <div className="chart-card">
        <p className="chart-title">🔄 Historique des mouvements (20 derniers)</p>
        {flux.length === 0 ? (
          <EmptyState icon="📭" title="Aucun mouvement enregistré" />
        ) : (
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th><th>Type</th><th>Quantité</th><th>Entrepôt</th><th>Note</th><th>Par</th>
                </tr>
              </thead>
              <tbody>
                {flux.map((f) => (
                  <tr key={f.id} className="table-row">
                    <td>{new Date(f.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${FLUX_COLORS[f.type] ?? '#94a3b8'}22`, color: FLUX_COLORS[f.type] ?? '#94a3b8' }}>
                        {f.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: ['achat','retour'].includes(f.type) ? 'var(--success)' : 'var(--error)' }}>
                      {['achat','retour'].includes(f.type) ? '+' : '-'}{f.quantite}
                    </td>
                    <td>{f.entrepot?.nom ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{f.note ?? '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.creerPar?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingLink ? 'Modifier fournisseur associé' : 'Associer un fournisseur'}
        size="md"
      >
        {formError && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {formError}</div>}
        <div className="field-group">
          <label className="field-label">Fournisseur *</label>
          <select
            className="field-select"
            value={linkForm.fournisseurId}
            onChange={(e) => setLinkForm((f) => ({ ...f, fournisseurId: e.target.value }))}
            disabled={!!editingLink}
          >
            <option value="">Sélectionner...</option>
            {fournisseursOptions.map((f) => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label className="field-label">Prix achat</label>
          <input
            className="field-input"
            type="number"
            min={0}
            step="0.01"
            value={linkForm.prixAchat}
            onChange={(e) => setLinkForm((f) => ({ ...f, prixAchat: e.target.value }))}
            placeholder="Ex: 120.00"
          />
        </div>
        <div className="field-group">
          <label className="field-label">Délai livraison (jours)</label>
          <input
            className="field-input"
            type="number"
            min={0}
            value={linkForm.delaiLivraison}
            onChange={(e) => setLinkForm((f) => ({ ...f, delaiLivraison: e.target.value }))}
            placeholder="Ex: 7"
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={savingLink}>Annuler</button>
          <button className="btn-primary-sm" onClick={saveLink} disabled={savingLink}>
            {savingLink ? 'Sauvegarde...' : editingLink ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteLinkId}
        onCancel={() => setDeleteLinkId(null)}
        onConfirm={deleteLink}
        title="Supprimer cette association fournisseur ?"
        message="Le fournisseur sera retiré de la fiche produit."
        confirmLabel="Supprimer"
        danger
        loading={deletingLink}
      />
    </div>
  );
}
