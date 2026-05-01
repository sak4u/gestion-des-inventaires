import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { EmptyState, Spinner, Badge, SearchInput } from '../components/ui/index';
import { entrepotsApi, fluxDeStockApi } from '../api/index';

interface Entrepot {
  id: string;
  nom: string;
  adresse?: string;
  capaciteMax?: number;
}

interface StockLine {
  id: string;
  quantite: number;
  stockAlerte?: number;
  produit?: {
    id: string;
    nom: string;
  };
}

type FluxType = 'achat' | 'vente' | 'perte' | 'retour' | 'correction_inventaire' | 'transfert';
interface FluxLine {
  id: string;
  type: FluxType | string;
  quantite: number;
  date: string;
  note?: string;
  produit?: {
    id: string;
    nom: string;
  };
}

const FLUX_COLORS: Record<string, 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray'> = {
  achat: 'green',
  retour: 'blue',
  vente: 'orange',
  correction_inventaire: 'purple',
  transfert: 'blue',
  perte: 'red',
};

export default function EntrepotDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [entrepot, setEntrepot] = useState<Entrepot | null>(null);
  const [stocks, setStocks] = useState<StockLine[]>([]);
  const [flux, setFlux] = useState<FluxLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockSearch, setStockSearch] = useState('');
  const [fluxSearch, setFluxSearch] = useState('');
  const [fluxTypeFilter, setFluxTypeFilter] = useState('');
  const [stockPage, setStockPage] = useState(1);
  const [fluxPage, setFluxPage] = useState(1);
  const pageSize = 8;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [entrepotRes, stockRes, fluxRes] = await Promise.all([
        entrepotsApi.get(id),
        entrepotsApi.stock(id),
        fluxDeStockApi.list({ entrepotId: id, limit: '100' }),
      ]);
      setEntrepot((entrepotRes.data ?? null) as Entrepot | null);
      setStocks((stockRes.data ?? []) as StockLine[]);
      setFlux((fluxRes.data ?? []) as FluxLine[]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const totalStock = stocks.reduce((sum, line) => sum + line.quantite, 0);
  const fillRate = entrepot?.capaciteMax
    ? Math.min(100, Math.round((totalStock / entrepot.capaciteMax) * 100))
    : null;

  const filteredStocks = useMemo(() => {
    const needle = stockSearch.trim().toLowerCase();
    if (!needle) return stocks;
    return stocks.filter((line) => (line.produit?.nom ?? '').toLowerCase().includes(needle));
  }, [stocks, stockSearch]);

  const filteredFlux = useMemo(() => {
    const needle = fluxSearch.trim().toLowerCase();
    return flux.filter((line) => {
      const matchType = !fluxTypeFilter || line.type === fluxTypeFilter;
      const matchSearch =
        !needle ||
        (line.produit?.nom ?? '').toLowerCase().includes(needle) ||
        (line.note ?? '').toLowerCase().includes(needle);
      return matchType && matchSearch;
    });
  }, [flux, fluxSearch, fluxTypeFilter]);

  const stockTotalPages = Math.max(1, Math.ceil(filteredStocks.length / pageSize));
  const fluxTotalPages = Math.max(1, Math.ceil(filteredFlux.length / pageSize));

  const pagedStocks = useMemo(() => {
    const start = (stockPage - 1) * pageSize;
    return filteredStocks.slice(start, start + pageSize);
  }, [filteredStocks, stockPage]);

  const pagedFlux = useMemo(() => {
    const start = (fluxPage - 1) * pageSize;
    return filteredFlux.slice(start, start + pageSize);
  }, [filteredFlux, fluxPage]);

  useEffect(() => {
    setStockPage(1);
  }, [stockSearch]);

  useEffect(() => {
    setFluxPage(1);
  }, [fluxSearch, fluxTypeFilter]);

  useEffect(() => {
    if (stockPage > stockTotalPages) setStockPage(stockTotalPages);
  }, [stockPage, stockTotalPages]);

  useEffect(() => {
    if (fluxPage > fluxTotalPages) setFluxPage(fluxTotalPages);
  }, [fluxPage, fluxTotalPages]);

  return (
    <div>
      <PageHeader
        icon="🏭"
        title={entrepot?.nom ?? 'Détail entrepôt'}
        subtitle={entrepot?.adresse ?? 'Adresse non renseignée'}
        actions={
          <button className="btn-secondary" onClick={() => navigate('/entrepots')}>
            ← Retour
          </button>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner size={36} />
        </div>
      ) : (
        <>
          <div className="chart-card" style={{ marginBottom: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Stock total</p>
                <p style={{ fontSize: 26, fontWeight: 800 }}>{totalStock}</p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Capacité max</p>
                <p style={{ fontSize: 26, fontWeight: 800 }}>{entrepot?.capaciteMax ?? '—'}</p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Remplissage</p>
                <p style={{ fontSize: 26, fontWeight: 800 }}>{fillRate !== null ? `${fillRate}%` : '—'}</p>
              </div>
            </div>
          </div>

          {stocks.length === 0 ? (
            <EmptyState
              icon="📭"
              title="Aucun stock enregistré"
              subtitle="Cet entrepôt ne contient pas encore de produits."
            />
          ) : (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
                <SearchInput placeholder="Rechercher un produit..." onSearch={setStockSearch} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
                  {filteredStocks.length} résultat(s)
                </span>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Quantité</th>
                      <th>Seuil Alerte</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedStocks.map((line) => {
                      const lowStock =
                        typeof line.stockAlerte === 'number' && line.quantite < line.stockAlerte;
                      return (
                        <tr key={line.id} className="table-row">
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {line.produit?.nom ?? 'Produit inconnu'}
                          </td>
                          <td style={{ fontWeight: 700 }}>{line.quantite}</td>
                          <td>{line.stockAlerte ?? '—'}</td>
                          <td>
                            <Badge variant={lowStock ? 'red' : 'green'}>
                              {lowStock ? 'Stock faible' : 'OK'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="table-pagination">
                  <span className="pagination-info">Page {stockPage} / {stockTotalPages}</span>
                  <div className="pagination-btns">
                    <button className="pagination-btn" disabled={stockPage === 1} onClick={() => setStockPage((p) => p - 1)}>
                      Préc.
                    </button>
                    <button className="pagination-btn" disabled={stockPage === stockTotalPages} onClick={() => setStockPage((p) => p + 1)}>
                      Suiv.
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <SearchInput placeholder="Rechercher dans l'historique..." onSearch={setFluxSearch} />
              <select
                className="field-select"
                style={{ width: 180, padding: '8px 12px' }}
                value={fluxTypeFilter}
                onChange={(e) => setFluxTypeFilter(e.target.value)}
              >
                <option value="">Tous les types</option>
                <option value="achat">Achat</option>
                <option value="vente">Vente</option>
                <option value="perte">Perte</option>
                <option value="retour">Retour</option>
                <option value="correction_inventaire">Correction</option>
                <option value="transfert">Transfert</option>
              </select>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Produit</th>
                    <th>Type</th>
                    <th>Quantité</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFlux.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>
                        Aucun flux enregistré pour cet entrepôt.
                      </td>
                    </tr>
                  ) : (
                    pagedFlux.map((line) => (
                      <tr key={line.id} className="table-row">
                        <td>{new Date(line.date).toLocaleDateString('fr-FR')}</td>
                        <td style={{ color: 'var(--text-primary)' }}>{line.produit?.nom ?? '—'}</td>
                        <td>
                          <Badge variant={FLUX_COLORS[line.type] ?? 'gray'}>{line.type}</Badge>
                        </td>
                        <td style={{ fontWeight: 700 }}>{line.quantite}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{line.note ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="table-pagination">
                <span className="pagination-info">Page {fluxPage} / {fluxTotalPages}</span>
                <div className="pagination-btns">
                  <button className="pagination-btn" disabled={fluxPage === 1} onClick={() => setFluxPage((p) => p - 1)}>
                    Préc.
                  </button>
                  <button className="pagination-btn" disabled={fluxPage === fluxTotalPages} onClick={() => setFluxPage((p) => p + 1)}>
                    Suiv.
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
