import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { produitsApi, fluxDeStockApi, commandesApi, propositionsApi, entrepotsApi, fournisseursApi, usersApi } from '../api/index';
import type { Kpis, FluxPoint, EntrepotStock, Flux, Proposition, Fournisseur, User, Commande } from '../types/dashboard';

// ── Role-specific dashboards ──────────────────────────────────────────────────
import AdminDashboard from '../components/dashboard/AdminDashboard';
import StockManagerDashboard from '../components/dashboard/StockManagerDashboard';
import WarehouseDashboard from '../components/dashboard/WarehouseDashboard';
import PurchaserDashboard from '../components/dashboard/PurchaserDashboard';

// ── Skeleton Loader ───────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: '120px', background: 'rgba(59,130,246,0.05)', borderRadius: '15px', animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
      <div style={{ height: '300px', background: 'rgba(59,130,246,0.05)', borderRadius: '15px', animation: 'pulse 1.5s infinite' }} />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [fluxData, setFluxData] = useState<FluxPoint[]>([]);
  const [entrepotData, setEntrepotData] = useState<EntrepotStock[]>([]);
  const [recentFlux, setRecentFlux] = useState<Flux[]>([]);
  const [propositions, setPropositions] = useState<Proposition[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [prodRes, fluxRes, cmdRes, propRes, entRes, statsRes, fourRes, usersRes] = await Promise.allSettled([
          produitsApi.list(),
          fluxDeStockApi.list({ limit: '50' }),
          commandesApi.list({ etat: 'EN_COURS' }),
          propositionsApi.list({ statut: 'EN_ATTENTE', limit: '5' }),
          entrepotsApi.list(),
          commandesApi.stats(),
          fournisseursApi.list(),
          usersApi.list(),
        ]);

        const produits = prodRes.status === 'fulfilled' ? (prodRes.value as { data: any[] }).data : [];
        const flux = fluxRes.status === 'fulfilled' ? (fluxRes.value as { data: any[] }).data : [];
        const cmds = cmdRes.status === 'fulfilled' ? (cmdRes.value as { data: any[] }).data : [];
        const props = propRes.status === 'fulfilled' ? (propRes.value as { data: any[] }).data : [];
        const entrepots = entRes.status === 'fulfilled' ? (entRes.value as { data: any[] }).data : [];
        const stats = statsRes.status === 'fulfilled' ? (statsRes.value as { data: any }).data : { revenue: 0, profit: 0 };
        const fours = fourRes.status === 'fulfilled' ? (fourRes.value as { data: any[] }).data : [];
        const usersList = usersRes.status === 'fulfilled' ? (usersRes.value as { data: any[] }).data : [];
        setFournisseurs(fours);
        setUsers(usersList);

        const produitsEnAlerte = produits.filter((p: any) => {
          const stockTotal = p.stockEntrepots?.reduce((s: number, se: any) => s + se.quantite, 0) ?? 0;
          return stockTotal <= p.stockAlert;
        }).length;

        const valeurStock = produits.reduce((acc: number, p: any) => {
          const stockTotal = p.stockEntrepots?.reduce((s: number, se: any) => s + se.quantite, 0) ?? 0;
          const prixAchat = p.prixAchatMoyen ?? 0;
          return acc + (prixAchat * stockTotal);
        }, 0);

        setKpis({
          totalProduits: produits.length,
          produitsEnAlerte,
          commandesEnCours: cmds.length,
          valeurStock,
          revenue: stats.revenue,
          profit: stats.profit,
        });
        setRecentFlux(flux.slice(0, 8));
        setPropositions(props);
        setCommandes(cmds);

        // Chart data logic
        const days: Record<string, { entrees: number; sorties: number }> = {};
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
          days[key] = { entrees: 0, sorties: 0 };
        }
        flux.forEach((f: any) => {
          const key = new Date(f.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
          if (days[key]) {
            if (f.type === 'achat' || f.type === 'retour') days[key].entrees += f.quantite;
            else days[key].sorties += f.quantite;
          }
        });
        setFluxData(Object.entries(days).map(([date, v]) => ({ date, ...v })));

        setEntrepotData(entrepots.map((e: any) => ({
          nom: e.nom,
          valeur: (e.stockEntrepots ?? []).reduce((s: number, se: any) => {
            const prix = se.produit?.prixAchatMoyen ?? 0;
            return s + (se.quantite * prix);
          }, 0),
        })));

      } catch (err) {
        console.error('Dashboard load error', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <DashboardSkeleton />;

  const role = user?.role?.name;

  switch (role) {
    case 'ADMIN':
      return <AdminDashboard kpis={kpis} fluxData={fluxData} entrepotData={entrepotData} recentFlux={recentFlux} users={users} />;
    case 'RESPONSABLE_STOCK':
      return <StockManagerDashboard kpis={kpis} propositions={propositions} entrepots={entrepotData} />;
    case 'MAGASINIER':
      return <WarehouseDashboard recentFlux={recentFlux} />;
    case 'ACHAT':
      return <PurchaserDashboard kpis={kpis} propositions={propositions} fournisseurs={fournisseurs} commandes={commandes} />;
    default:
      return <div>Accès non autorisé ou rôle inconnu.</div>;
  }
}
