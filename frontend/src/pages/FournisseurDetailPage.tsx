import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { EmptyState, Spinner, Badge, SearchInput } from '../components/ui/index';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { fournisseursApi, commandesApi, fournisseurProduitApi, produitsApi } from '../api/index';

interface Fournisseur {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
}

interface ProduitFournisseur {
  id: string;
  prixAchat?: number;
  delaiLivraison?: number;
  produitId?: string;
  produit?: {
    id: string;
    nom: string;
  };
}

interface ProduitOption {
  id: string;
  nom: string;
}

interface Commande {
  id: string;
  etat: 'EN_COURS' | 'FERMEE' | 'LIVREE' | 'ANNULEE' | string;
  type: 'ACHAT' | 'VENTE' | string;
  dateCreation: string;
  commandesLigne?: Array<{ quantite: number; prixUnitaireAchat?: number }>;
}

const ETAT_BADGE: Record<string, 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray'> = {
  EN_COURS: 'orange',
  LIVREE: 'green',
  FERMEE: 'gray',
  ANNULEE: 'red',
};

export default function FournisseurDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [fournisseur, setFournisseur] = useState<Fournisseur | null>(null);
  const [catalogue, setCatalogue] = useState<ProduitFournisseur[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [produitsOptions, setProduitsOptions] = useState<ProduitOption[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [commandeSearch, setCommandeSearch] = useState('');
  const [etatFilter, setEtatFilter] = useState('');
  const [cataloguePage, setCataloguePage] = useState(1);
  const [commandePage, setCommandePage] = useState(1);
  const [showCatalogueModal, setShowCatalogueModal] = useState(false);
  const [editingLink, setEditingLink] = useState<ProduitFournisseur | null>(null);
  const [deleteLinkId, setDeleteLinkId] = useState<string | null>(null);
  const [savingLink, setSavingLink] = useState(false);
  const [deletingLink, setDeletingLink] = useState(false);
  const [formError, setFormError] = useState('');
  const [linkForm, setLinkForm] = useState({
    produitId: '',
    prixAchat: '',
    delaiLivraison: '',
  });
  const pageSize = 8;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [fournisseurRes, produitsRes, commandesRes, produitsOptionsRes] = await Promise.all([
        fournisseursApi.get(id),
        fournisseursApi.produits(id),
        commandesApi.list({ fournisseurId: id, type: 'ACHAT', limit: '100' }),
        produitsApi.list(),
      ]);
      setFournisseur((fournisseurRes.data ?? null) as Fournisseur | null);
      setCatalogue((produitsRes.data ?? []) as ProduitFournisseur[]);
      setCommandes((commandesRes.data ?? []) as Commande[]);
      setProduitsOptions((produitsOptionsRes.data ?? []) as ProduitOption[]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredCatalogue = useMemo(() => {
    const needle = catalogueSearch.trim().toLowerCase();
    if (!needle) return catalogue;
    return catalogue.filter((row) => (row.produit?.nom ?? '').toLowerCase().includes(needle));
  }, [catalogue, catalogueSearch]);

  const filteredCommandes = useMemo(() => {
    const needle = commandeSearch.trim().toLowerCase();
    return commandes.filter((commande) => {
      const matchEtat = !etatFilter || commande.etat === etatFilter;
      const matchSearch =
        !needle ||
        commande.id.toLowerCase().includes(needle) ||
        commande.type.toLowerCase().includes(needle);
      return matchEtat && matchSearch;
    });
  }, [commandes, commandeSearch, etatFilter]);

  const catalogueTotalPages = Math.max(1, Math.ceil(filteredCatalogue.length / pageSize));
  const commandeTotalPages = Math.max(1, Math.ceil(filteredCommandes.length / pageSize));

  const pagedCatalogue = useMemo(() => {
    const start = (cataloguePage - 1) * pageSize;
    return filteredCatalogue.slice(start, start + pageSize);
  }, [filteredCatalogue, cataloguePage]);

  const pagedCommandes = useMemo(() => {
    const start = (commandePage - 1) * pageSize;
    return filteredCommandes.slice(start, start + pageSize);
  }, [filteredCommandes, commandePage]);

  useEffect(() => {
    setCataloguePage(1);
  }, [catalogueSearch]);

  useEffect(() => {
    setCommandePage(1);
  }, [commandeSearch, etatFilter]);

  useEffect(() => {
    if (cataloguePage > catalogueTotalPages) setCataloguePage(catalogueTotalPages);
  }, [cataloguePage, catalogueTotalPages]);

  useEffect(() => {
    if (commandePage > commandeTotalPages) setCommandePage(commandeTotalPages);
  }, [commandePage, commandeTotalPages]);

  const totalCommandes = filteredCommandes.length;
  const totalMontant = filteredCommandes.reduce((sum, commande) => {
    const montantCommande = (commande.commandesLigne ?? []).reduce(
      (lineSum, line) => lineSum + line.quantite * (line.prixUnitaireAchat ?? 0),
      0,
    );
    return sum + montantCommande;
  }, 0);

  const openCreateCatalogue = () => {
    setEditingLink(null);
    setFormError('');
    setLinkForm({ produitId: '', prixAchat: '', delaiLivraison: '' });
    setShowCatalogueModal(true);
  };

  const openEditCatalogue = (link: ProduitFournisseur) => {
    setEditingLink(link);
    setFormError('');
    setLinkForm({
      produitId: link.produitId ?? link.produit?.id ?? '',
      prixAchat: typeof link.prixAchat === 'number' ? String(link.prixAchat) : '',
      delaiLivraison: typeof link.delaiLivraison === 'number' ? String(link.delaiLivraison) : '',
    });
    setShowCatalogueModal(true);
  };

  const saveCatalogueLink = async () => {
    if (!id) return;
    if (!linkForm.produitId) {
      setFormError('Veuillez sélectionner un produit.');
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
        fournisseurId: id,
        produitId: linkForm.produitId,
        prixAchat: linkForm.prixAchat ? Number(linkForm.prixAchat) : undefined,
        delaiLivraison: linkForm.delaiLivraison ? Number.parseInt(linkForm.delaiLivraison, 10) : undefined,
      };
      if (editingLink) await fournisseurProduitApi.update(editingLink.id, payload);
      else await fournisseurProduitApi.create(payload);
      setShowCatalogueModal(false);
      setCatalogueLoading(true);
      const res = await fournisseursApi.produits(id);
      setCatalogue((res.data ?? []) as ProduitFournisseur[]);
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
      setCatalogueLoading(false);
    }
  };

  const deleteCatalogueLink = async () => {
    if (!id || !deleteLinkId) return;
    setDeletingLink(true);
    try {
      await fournisseurProduitApi.delete(deleteLinkId);
      const res = await fournisseursApi.produits(id);
      setCatalogue((res.data ?? []) as ProduitFournisseur[]);
    } finally {
      setDeletingLink(false);
      setDeleteLinkId(null);
    }
  };

  return (
    <div>
      <PageHeader
        icon="🤝"
        title={fournisseur?.nom ?? 'Détail fournisseur'}
        subtitle={fournisseur?.email ?? fournisseur?.telephone ?? 'Informations fournisseur'}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-icon" onClick={openCreateCatalogue}>
              ＋ Associer produit
            </button>
            <button className="btn-secondary" onClick={() => navigate('/fournisseurs')}>
              ← Retour
            </button>
          </div>
        }
      />

      {!loading && fournisseur && (
        <div className="chart-card" style={{ marginBottom: 18 }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>
            <strong>Email:</strong> {fournisseur.email ?? '—'}
          </p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>
            <strong>Téléphone:</strong> {fournisseur.telephone ?? '—'}
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>
            <strong>Adresse:</strong> {fournisseur.adresse ?? '—'}
          </p>
        </div>
      )}

      {!loading && (
        <div className="chart-card" style={{ marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Produits liés</p>
              <p style={{ fontSize: 24, fontWeight: 800 }}>{filteredCatalogue.length}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Commandes achats</p>
              <p style={{ fontSize: 24, fontWeight: 800 }}>{totalCommandes}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Montant cumulé</p>
              <p style={{ fontSize: 24, fontWeight: 800 }}>{totalMontant.toFixed(2)} DT</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner size={36} />
        </div>
      ) : catalogueLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}>
          <Spinner size={28} />
        </div>
      ) : catalogue.length === 0 ? (
        <EmptyState
          icon="📦"
          title="Catalogue vide"
          subtitle="Aucun produit n'est encore associé à ce fournisseur."
        />
      ) : (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
            <SearchInput placeholder="Rechercher un produit du catalogue..." onSearch={setCatalogueSearch} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
              {filteredCatalogue.length} résultat(s)
            </span>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Prix Achat</th>
                  <th>Délai Livraison</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedCatalogue.map((row) => (
                  <tr key={row.id} className="table-row">
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {row.produit?.nom ?? 'Produit inconnu'}
                    </td>
                    <td style={{ color: 'var(--success)', fontWeight: 700 }}>
                      {typeof row.prixAchat === 'number' ? `${row.prixAchat.toFixed(2)} DT` : '—'}
                    </td>
                    <td>{typeof row.delaiLivraison === 'number' ? `${row.delaiLivraison} jour(s)` : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => openEditCatalogue(row)}>
                          ✏️
                        </button>
                        <button className="btn-danger" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setDeleteLinkId(row.id)}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-pagination">
              <span className="pagination-info">Page {cataloguePage} / {catalogueTotalPages}</span>
              <div className="pagination-btns">
                <button className="pagination-btn" disabled={cataloguePage === 1} onClick={() => setCataloguePage((p) => p - 1)}>
                  Préc.
                </button>
                <button className="pagination-btn" disabled={cataloguePage === catalogueTotalPages} onClick={() => setCataloguePage((p) => p + 1)}>
                  Suiv.
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <SearchInput placeholder="Rechercher une commande..." onSearch={setCommandeSearch} />
          <select
            className="field-select"
            style={{ width: 180, padding: '8px 12px' }}
            value={etatFilter}
            onChange={(e) => setEtatFilter(e.target.value)}
          >
            <option value="">Tous les états</option>
            <option value="EN_COURS">EN_COURS</option>
            <option value="LIVREE">LIVREE</option>
            <option value="FERMEE">FERMEE</option>
            <option value="ANNULEE">ANNULEE</option>
          </select>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Type</th>
                <th>Etat</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>
                    <Spinner size={18} />
                  </td>
                </tr>
              ) : filteredCommandes.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>
                    Aucune commande d'achat liée à ce fournisseur.
                  </td>
                </tr>
              ) : (
                pagedCommandes.map((commande) => {
                  const total = (commande.commandesLigne ?? []).reduce(
                    (sum, line) => sum + line.quantite * (line.prixUnitaireAchat ?? 0),
                    0,
                  );
                  return (
                    <tr key={commande.id} className="table-row">
                      <td><code style={{ fontSize: 11 }}>{commande.id.slice(0, 8)}...</code></td>
                      <td>{new Date(commande.dateCreation).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <Badge variant={commande.type === 'ACHAT' ? 'blue' : 'purple'}>
                          {commande.type}
                        </Badge>
                      </td>
                      <td><Badge variant={ETAT_BADGE[commande.etat] ?? 'gray'}>{commande.etat}</Badge></td>
                      <td style={{ fontWeight: 700 }}>{total.toFixed(2)} DT</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <div className="table-pagination">
            <span className="pagination-info">Page {commandePage} / {commandeTotalPages}</span>
            <div className="pagination-btns">
              <button className="pagination-btn" disabled={commandePage === 1} onClick={() => setCommandePage((p) => p - 1)}>
                Préc.
              </button>
              <button className="pagination-btn" disabled={commandePage === commandeTotalPages} onClick={() => setCommandePage((p) => p + 1)}>
                Suiv.
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={showCatalogueModal}
        onClose={() => setShowCatalogueModal(false)}
        title={editingLink ? 'Modifier association produit' : 'Nouvelle association produit'}
        size="md"
      >
        {formError && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            ⚠️ {formError}
          </div>
        )}
        <div className="field-group">
          <label className="field-label">Produit *</label>
          <select
            className="field-select"
            value={linkForm.produitId}
            onChange={(e) => setLinkForm((f) => ({ ...f, produitId: e.target.value }))}
            disabled={!!editingLink}
          >
            <option value="">Sélectionner...</option>
            {produitsOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.nom}</option>
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
            placeholder="Ex: 125.50"
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
            placeholder="Ex: 5"
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button className="btn-secondary" onClick={() => setShowCatalogueModal(false)} disabled={savingLink}>
            Annuler
          </button>
          <button className="btn-primary-sm" onClick={saveCatalogueLink} disabled={savingLink}>
            {savingLink ? 'Sauvegarde...' : editingLink ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteLinkId}
        onCancel={() => setDeleteLinkId(null)}
        onConfirm={deleteCatalogueLink}
        title="Supprimer cette association produit ?"
        message="Le produit sera retiré du catalogue de ce fournisseur."
        confirmLabel="Supprimer"
        danger
        loading={deletingLink}
      />
    </div>
  );
}
