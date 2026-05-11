import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { EmptyState, Spinner, SearchInput, BarcodeScanner } from '../components/ui/index';
import Modal from '../components/ui/Modal';
import { fluxDeStockApi, produitsApi, entrepotsApi, stockEntrepotApi } from '../api/index';
import { useAuth } from '../contexts/AuthContext';

const FLUX_COLORS: Record<string, string> = {
  achat:'#10b981',vente:'#3b82f6',perte:'#ef4444',
  retour:'#f59e0b',correction_inventaire:'#8b5cf6',transfert:'#06b6d4',
};
const FLUX_ICONS: Record<string,string> = {
  achat:'📥',vente:'📤',perte:'💔',retour:'↩️',correction_inventaire:'🔧',transfert:'🔀',
};
const MANUAL = ['vente','perte','retour','correction_inventaire','transfert'];

export default function FluxDeStockPage() {
  const { user } = useAuth();
  const [flux, setFlux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [produitFilter, setProduitFilter] = useState('');
  const [entrepotFilter, setEntrepotFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ produitId: '', codeBare: '', entrepotId: '', type: 'vente', quantite: '', note: '' });
  const [produits, setProduits] = useState<any[]>([]);
  const [entrepots, setEntrepots] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const location = useLocation();

  const load = useCallback(async()=>{
    setLoading(true);
    try{ const r=await fluxDeStockApi.list(); setFlux(r.data??[]); }
    finally{ setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  // ── Auto-open modal when navigated from scanner shortcuts ─────────────────
  useEffect(() => {
    const state = location.state as { openModal?: boolean; fluxType?: string } | null;
    if (!state?.openModal) return;
    const fluxType = state.fluxType ?? 'vente';
    setForm({ produitId: '', codeBare: '', entrepotId: '', type: fluxType, quantite: '', note: '' });
    setError('');
    setShowModal(true);
    // Clear navigation state so re-renders don't re-open the modal
    window.history.replaceState({}, '');
  }, [location.state]);
  useEffect(() => {
    const preload = async () => {
      const [p, e] = await Promise.allSettled([produitsApi.list(), entrepotsApi.list()]);
      if (p.status === 'fulfilled') setProduits(p.value.data ?? []);
      if (e.status === 'fulfilled') setEntrepots(e.value.data ?? []);
    };
    void preload();
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return flux.filter((f) => {
      const typeOk = !typeFilter || f.type === typeFilter;
      const produitOk = !produitFilter || f.produit?.id === produitFilter;
      const entrepotOk = !entrepotFilter || f.entrepot?.id === entrepotFilter;
      const date = new Date(f.date);
      const fromOk = !fromDate || date >= new Date(`${fromDate}T00:00:00`);
      const toOk = !toDate || date <= new Date(`${toDate}T23:59:59`);
      const searchOk =
        !needle ||
        (f.produit?.nom ?? '').toLowerCase().includes(needle) ||
        (f.entrepot?.nom ?? '').toLowerCase().includes(needle) ||
        (f.note ?? '').toLowerCase().includes(needle);
      return typeOk && produitOk && entrepotOk && fromOk && toOk && searchOk;
    });
  }, [flux, typeFilter, produitFilter, entrepotFilter, fromDate, toDate, search]);

  const openModal = async()=>{
    setForm({produitId:'',codeBare:'',entrepotId:'',type:'vente',quantite:'',note:''}); setError(''); setShowModal(true);
    const [p,e] = await Promise.allSettled([produitsApi.list(),entrepotsApi.list()]);
    if(p.status==='fulfilled') setProduits(p.value.data??[]);
    if(e.status==='fulfilled') setEntrepots(e.value.data??[]);
  };

  const handleSave = async()=>{
    if(!form.produitId||!form.entrepotId||!form.quantite){setError('Champs obligatoires manquants.');return;}
    if(!user?.id){setError('Session expirée, reconnectez-vous.');return;}
    
    setSaving(true); setError('');
    try{ 
      const { codeBare, ...filteredData } = form;
      await fluxDeStockApi.create({
        ...filteredData,
        quantite: +form.quantite,
        creerParId: user.id
      }); 
      setShowModal(false); 
      await load(); 
    }
    catch(e:any){ setError(e?.response?.data?.message??'Erreur.'); }
    finally{ setSaving(false); }
  };

  const handleBarcodeLookup = async () => {
    const codeBare = form.codeBare.trim();
    if (!codeBare) return;
    try {
      const res = await produitsApi.lookupByCodeBare(codeBare);
      const produit = res.data as { id: string };
      setForm((prev) => ({ ...prev, produitId: produit.id }));
    } catch {
      setError(`Code-barres introuvable: ${codeBare}`);
    }
  };

  const handleExportCsv = async () => {
    const params: Record<string, string> = {};
    if (produitFilter) params.produitId = produitFilter;
    if (entrepotFilter) params.entrepotId = entrepotFilter;
    const res = await stockEntrepotApi.exportCsv(params);
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `stock-entrepot-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const [productSearch, setProductSearch] = useState('');

  // Sync search text when produitId changes (e.g. via barcode scan)
  useEffect(() => {
    const p = produits.find(x => x.id === form.produitId);
    if (p && p.nom !== productSearch) setProductSearch(p.nom);
    if (!form.produitId && !form.codeBare) setProductSearch('');
  }, [form.produitId, produits]);

  return (
    <div>
      <PageHeader icon="🔄" title="Flux de Stock" subtitle={`${flux.length} mouvement(s)`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={() => void handleExportCsv()} id="btn-export-stock-csv">⬇ Export CSV stock</button>
            <button className="btn-icon" onClick={() => { setProductSearch(''); openModal(); }} id="btn-nouveau-flux">＋ Ajouter un mouvement</button>
          </div>
        }
      />
      <div style={{ marginBottom: 12 }}>
        <SearchInput placeholder="Rechercher produit, entrepôt, note..." onSearch={setSearch} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select className="field-select" style={{ width: 200, padding: '8px 12px' }} value={produitFilter} onChange={(e) => setProduitFilter(e.target.value)}>
          <option value="">Tous les produits</option>
          {produits.map((p: any) => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </select>
        <select className="field-select" style={{ width: 200, padding: '8px 12px' }} value={entrepotFilter} onChange={(e) => setEntrepotFilter(e.target.value)}>
          <option value="">Tous les entrepôts</option>
          {entrepots.map((e: any) => <option key={e.id} value={e.id}>{e.nom}</option>)}
        </select>
        <input className="field-input" style={{ width: 170 }} type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input className="field-input" style={{ width: 170 }} type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </div>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {['','achat','vente','perte','retour','correction_inventaire','transfert'].map(t=>(
          <button key={t} onClick={()=>setTypeFilter(t)} style={{
            padding:'6px 14px',fontSize:12,fontWeight:600,borderRadius:20,cursor:'pointer',border:'none',
            background:typeFilter===t?(FLUX_COLORS[t]??'var(--accent)')+'33':'rgba(255,255,255,0.04)',
            color:typeFilter===t?(FLUX_COLORS[t]??'var(--accent-light)'):'var(--text-muted)',
          }}>{t?`${FLUX_ICONS[t]} ${t.replace('_',' ')}`:'Tous'}</button>
        ))}
      </div>
      {loading?(<div style={{display:'flex',justifyContent:'center',padding:60}}><Spinner size={36}/></div>
      ):filtered.length===0?(<EmptyState icon="🔄" title="Aucun mouvement" subtitle="Aucun flux ne correspond à vos filtres."/>
      ):(
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Type</th><th>Produit</th><th>Quantité</th><th>Entrepôt</th><th>Note</th><th>Créé par</th></tr></thead>
            <tbody>
              {filtered.map(f=>(
                <tr key={f.id} className="table-row">
                  <td style={{fontSize:12,color:'var(--text-muted)'}}>{new Date(f.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}</td>
                  <td><span style={{fontSize:12,fontWeight:700,padding:'3px 10px',borderRadius:20,background:`${FLUX_COLORS[f.type]??'#94a3b8'}22`,color:FLUX_COLORS[f.type]??'#94a3b8'}}>{FLUX_ICONS[f.type]} {f.type.replace('_',' ')}</span></td>
                  <td style={{fontWeight:600,color:'var(--text-primary)'}}>{f.produit?.nom??'—'}</td>
                  <td>
                    {(() => {
                      const isIncoming = ['achat', 'retour'].includes(f.type) || (f.type === 'correction_inventaire' && f.quantite > 0);
                      const isOutgoing = ['vente', 'perte'].includes(f.type) || (f.type === 'correction_inventaire' && f.quantite < 0);
                      const prefix = isIncoming ? '+' : isOutgoing ? '-' : '';
                      const color = isIncoming ? 'var(--success)' : isOutgoing ? 'var(--error)' : 'var(--text-primary)';
                      return (
                        <span style={{ fontWeight: 800, fontSize: 16, color }}>
                          {prefix}{Math.abs(f.quantite)}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{fontSize:13,color:'var(--text-secondary)'}}>{f.entrepot?.nom??'—'}</td>
                  <td style={{fontSize:12,color:'var(--text-muted)',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.note??'—'}</td>
                  <td style={{fontSize:12,color:'var(--text-muted)'}}>{f.creerPar?.name??'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={showModal} onClose={()=>setShowModal(false)} title="Ajouter un mouvement" size="md">
        {error&&<div className="alert alert-error" style={{marginBottom:16}}>⚠️ {error}</div>}
        <div className="field-group"><label className="field-label">Produit *</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              className="field-input"
              placeholder="Scanner/saisir code-barres..."
              value={form.codeBare}
              onChange={(e) => setForm((f) => ({ ...f, codeBare: e.target.value }))}
              onBlur={() => void handleBarcodeLookup()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleBarcodeLookup();
                }
              }}
            />
            <button className="btn-secondary" onClick={() => void handleBarcodeLookup()}>🔎</button>
            <button className="btn-secondary" onClick={() => setShowScanner(true)} title="Scanner avec la caméra">📷</button>
          </div>
          <input
            className="field-input"
            list="produits-list"
            placeholder="Rechercher un produit par nom..."
            value={productSearch}
            onChange={e => {
              const name = e.target.value;
              setProductSearch(name);
              const p = produits.find(x => x.nom === name);
              if (p) {
                setForm(f => ({ ...f, produitId: p.id, codeBare: p.codeBare }));
              } else {
                setForm(f => ({ ...f, produitId: '', codeBare: '' }));
              }
            }}
          />
          <datalist id="produits-list">
            {produits.map((p: any) => <option key={p.id} value={p.nom} />)}
          </datalist>
        </div>
        <div className="field-group"><label className="field-label">Entrepôt *</label>
          <select className="field-select" value={form.entrepotId} onChange={e=>setForm(f=>({...f,entrepotId:e.target.value}))}>
            <option value="">Sélectionner…</option>
            {entrepots.map((e:any)=><option key={e.id} value={e.id}>{e.nom}</option>)}
          </select></div>
        <div className="field-group"><label className="field-label">Type *</label>
          <select className="field-select" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
            {MANUAL.map(t=><option key={t} value={t}>{FLUX_ICONS[t]} {t.replace('_',' ')}</option>)}
          </select></div>
        <div className="field-group"><label className="field-label">Quantité *</label>
          <input className="field-input" type="number" min={1} value={form.quantite} onChange={e=>setForm(f=>({...f,quantite:e.target.value}))} placeholder="Ex: 50"/></div>
        <div className="field-group"><label className="field-label">Note</label>
          <textarea className="field-textarea" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Raison du mouvement…"/></div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:8}}>
          <button className="btn-secondary" onClick={()=>setShowModal(false)} disabled={saving}>Annuler</button>
          <button className="btn-primary-sm" onClick={handleSave} disabled={saving}>{saving?<Spinner size={16}/>:'Enregistrer'}</button>
        </div>
      </Modal>

      <BarcodeScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(code) => {
          setForm((f) => ({ ...f, codeBare: code }));
          setShowScanner(false);
          // lookup after state settles
          setTimeout(() => {
            produitsApi.lookupByCodeBare(code)
              .then((res) => {
                const produit = res.data as { id: string };
                setForm((f) => ({ ...f, produitId: produit.id }));
              })
              .catch(() => setError(`Code-barres introuvable: ${code}`));
          }, 0);
        }}
        title="Scanner un code-barres"
      />
    </div>
  );
}
