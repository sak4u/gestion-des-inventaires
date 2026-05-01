import { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { KpiCard } from '../components/ui/index';
import { produitsApi, fluxDeStockApi, commandesApi, propositionsApi, entrepotsApi } from '../api/index';

// ── Types ─────────────────────────────────────────────────────────────────────
type FluxType = 'achat' | 'vente' | 'perte' | 'retour' | 'correction_inventaire' | 'transfert';

interface Kpis {
  totalProduits: number;
  produitsEnAlerte: number;
  commandesEnCours: number;
  valeurStock: number;
}

interface FluxPoint { date: string; entrees: number; sorties: number; }
interface EntrepotStock { nom: string; valeur: number; }
interface Produit {
  id: string;
  nom: string;
  stockAlert: number;
  prixActuel: number | null;
  stockTotal?: number;
}
interface Flux {
  id: string;
  date: string;
  type: FluxType;
  quantite: number;
  produit?: { nom?: string };
}
interface Proposition {
  id: string;
  quantiteProposee: number;
  statut: 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE' | string;
  produit?: { nom?: string };
}
interface Entrepot {
  id: string;
  nom: string;
  stockEntrepots?: Array<{ quantite: number; produit?: { prixActuel: number | null } }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const FLUX_TYPE_COLORS: Record<string, string> = {
  achat:                 '#10b981',
  vente:                 '#3b82f6',
  perte:                 '#ef4444',
  retour:                '#f59e0b',
  correction_inventaire: '#8b5cf6',
  transfert:             '#06b6d4',
};

const STATUT_BADGE: Record<string, { label: string; cls: string }> = {
  EN_ATTENTE: { label: 'En attente', cls: 'badge--orange' },
  ACCEPTEE:   { label: 'Acceptée',   cls: 'badge--green'  },
  REFUSEE:    { label: 'Refusée',    cls: 'badge--red'    },
};

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
interface ChartTooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(13,21,40,0.97)',
      border: '1px solid rgba(59,130,246,0.2)',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 13,
    }}>
      <p style={{ color: '#94a3b8', marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// ── Skeleton loader ────────────────────────────────────────────────────────────
function Skeleton({ h = 24, w = '100%' }: { h?: number; w?: number | string }) {
  return (
    <div style={{
      height: h,
      width: w,
      background: 'rgba(59,130,246,0.08)',
      borderRadius: 8,
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [fluxData, setFluxData] = useState<FluxPoint[]>([]);
  const [entrepotData, setEntrepotData] = useState<EntrepotStock[]>([]);
  const [recentFlux, setRecentFlux] = useState<Flux[]>([]);
  const [propositions, setPropositions] = useState<Proposition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Load all data in parallel
        const [prodRes, fluxRes, cmdRes, propRes, entRes] = await Promise.allSettled([
          produitsApi.list(),
          fluxDeStockApi.list({ limit: '50' }),
          commandesApi.list({ etat: 'EN_COURS' }),
          propositionsApi.list({ statut: 'EN_ATTENTE', limit: '5' }),
          entrepotsApi.list(),
        ]);

        // KPIs
        const produits: Produit[] = prodRes.status === 'fulfilled' && Array.isArray(prodRes.value.data) ? prodRes.value.data as Produit[] : [];
        const flux: Flux[] = fluxRes.status === 'fulfilled' && Array.isArray(fluxRes.value.data) ? fluxRes.value.data as Flux[] : [];
        const cmds: unknown[] = cmdRes.status === 'fulfilled' && Array.isArray(cmdRes.value.data) ? cmdRes.value.data : [];
        const props: Proposition[] = propRes.status === 'fulfilled' && Array.isArray(propRes.value.data) ? propRes.value.data as Proposition[] : [];
        const entrepots: Entrepot[] = entRes.status === 'fulfilled' && Array.isArray(entRes.value.data) ? entRes.value.data as Entrepot[] : [];

        // Produits en alerte: need to check stock per product
        // We use stockAlert from product and compare with sum of StockEntrepot
        const produitsEnAlerte = produits.filter((p) => (p.stockTotal ?? 0) <= p.stockAlert).length;

        const valeurStock = produits.reduce((acc, p) => acc + ((p.prixActuel ?? 0) * (p.stockTotal ?? 0)), 0);

        setKpis({
          totalProduits: produits.length,
          produitsEnAlerte,
          commandesEnCours: cmds.length,
          valeurStock,
        });

        // Recent flux (last 5 for mini-table)
        setRecentFlux(flux.slice(0, 5));

        // Propositions
        setPropositions(props.slice(0, 5));

        // LineChart: group flux by date (last 7 days)
        const days: Record<string, { entrees: number; sorties: number }> = {};
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
          days[key] = { entrees: 0, sorties: 0 };
        }
        flux.forEach((f) => {
          const key = new Date(f.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
          if (!days[key]) return;
          if (f.type === 'achat' || f.type === 'retour') days[key].entrees += f.quantite;
          else days[key].sorties += f.quantite;
        });
        setFluxData(Object.entries(days).map(([date, v]) => ({ date, ...v })));

        // PieChart: stock value per entrepôt
        setEntrepotData(
          entrepots.map((e) => ({
            nom: e.nom,
            valeur: (e.stockEntrepots ?? []).reduce(
              (s, se) => s + se.quantite * (se.produit?.prixActuel ?? 0),
              0,
            ),
          })),
        );
      } catch (err) {
        console.error('Dashboard load error', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pieData = useMemo(
    () => entrepotData.filter((item) => item.valeur > 0),
    [entrepotData],
  );

  return (
    <div>
      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="kpi-grid">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="kpi-card kpi-card--blue">
              <Skeleton h={36} w={36} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton h={12} w="60%" />
                <Skeleton h={28} w="40%" />
              </div>
            </div>
          ))
        ) : (
          <>
            <KpiCard icon="📦" label="Total Produits"    value={kpis?.totalProduits ?? 0}  color="blue" />
            <KpiCard icon="⚠️" label="Alertes Stock"     value={kpis?.produitsEnAlerte ?? 0} color="red"
              trend={kpis?.produitsEnAlerte ? 'down' : 'stable'}
              trendValue={kpis?.produitsEnAlerte ? 'Réapprovisionnement requis' : 'Stock OK'} />
            <KpiCard icon="🧾" label="Commandes en cours" value={kpis?.commandesEnCours ?? 0} color="orange" />
            <KpiCard icon="💰" label="Valeur du Stock"
              value={`${(kpis?.valeurStock ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DT`}
              color="green" />
          </>
        )}
      </div>

      {/* ── Charts ───────────────────────────────────────────────── */}
      <div className="charts-grid">
        {/* Line chart */}
        <div className="chart-card">
          <p className="chart-title">📈 Mouvements de stock — 7 derniers jours</p>
          {loading ? <Skeleton h={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={fluxData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Line type="monotone" dataKey="entrees" stroke="#10b981" strokeWidth={2.5} dot={false} name="Entrées" />
                <Line type="monotone" dataKey="sorties" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Sorties" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="chart-card">
          <p className="chart-title">🏭 Stock par Entrepôt</p>
          {loading ? <Skeleton h={220} /> : pieData.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
              Aucune valeur de stock à afficher
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  dataKey="valeur" nameKey="nom" paddingAngle={3}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${Number(v).toLocaleString()} DT`} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Recent tables ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Propositions IA */}
        <div className="chart-card">
          <p className="chart-title">🤖 Propositions IA en attente</p>
          {loading ? <Skeleton h={160} /> : propositions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
              Aucune proposition en attente
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Produit', 'Qté', 'Statut'].map((h) => (
                    <th key={h} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 8px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {propositions.map((p) => {
                  const s = STATUT_BADGE[p.statut] ?? { label: p.statut, cls: 'badge--gray' };
                  return (
                    <tr key={p.id} style={{ borderTop: '1px solid rgba(59,130,246,0.06)' }}>
                      <td style={{ fontSize: 13, padding: '8px', color: 'var(--text-secondary)' }}>{p.produit?.nom ?? '—'}</td>
                      <td style={{ fontSize: 13, padding: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>{p.quantiteProposee}</td>
                      <td style={{ padding: '8px' }}><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent flux */}
        <div className="chart-card">
          <p className="chart-title">🔄 Derniers mouvements de stock</p>
          {loading ? <Skeleton h={160} /> : recentFlux.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
              Aucun mouvement enregistré
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Produit', 'Type', 'Qté', 'Date'].map((h) => (
                    <th key={h} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 8px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentFlux.map((f) => (
                  <tr key={f.id} style={{ borderTop: '1px solid rgba(59,130,246,0.06)' }}>
                    <td style={{ fontSize: 13, padding: '8px', color: 'var(--text-secondary)' }}>{f.produit?.nom ?? '—'}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        background: `${FLUX_TYPE_COLORS[f.type] ?? '#94a3b8'}22`,
                        color: FLUX_TYPE_COLORS[f.type] ?? '#94a3b8',
                      }}>{f.type}</span>
                    </td>
                    <td style={{ fontSize: 13, padding: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>{f.quantite}</td>
                    <td style={{ fontSize: 12, padding: '8px', color: 'var(--text-muted)' }}>
                      {new Date(f.date).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
