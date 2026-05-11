import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import { EmptyState, Spinner, BarcodeScanner } from '../components/ui/index';
import { commandeLignesApi, commandesApi, entrepotsApi, fournisseursApi, produitsApi } from '../api/index';
import { useAuth } from '../contexts/AuthContext';

interface OptionItem {
  id: string;
  nom: string;
}
interface ProductItem {
  id: string;
  nom: string;
  codeBare?: string;
  prixAchatMoyen?: number;
  prixVente?: number;
}
interface LigneForm {
  produitId: string;
  codeBare: string;
  quantite: number;
  prixUnitaire: number;
}

export default function NouvelleCommandePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fournisseurs, setFournisseurs] = useState<OptionItem[]>([]);
  const [entrepots, setEntrepots] = useState<OptionItem[]>([]);
  const [produits, setProduits] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [type, setType] = useState<'ACHAT' | 'VENTE'>('ACHAT');
  const [fournisseurId, setFournisseurId] = useState('');
  const [entrepotId, setEntrepotId] = useState('');
  const [lignes, setLignes] = useState<LigneForm[]>([
    { produitId: '', codeBare: '', quantite: 1, prixUnitaire: 0 },
  ]);
  const [scannerIndex, setScannerIndex] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [fr, er, pr] = await Promise.all([
          fournisseursApi.list(),
          entrepotsApi.list(),
          produitsApi.list(),
        ]);
        setFournisseurs((fr.data ?? []) as OptionItem[]);
        setEntrepots((er.data ?? []) as OptionItem[]);
        setProduits((pr.data ?? []) as ProductItem[]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const setLigne = (index: number, patch: Partial<LigneForm>) => {
    setLignes((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );
  };

  const addLigne = () => {
    setLignes((prev) => [...prev, { produitId: '', codeBare: '', quantite: 1, prixUnitaire: 0 }]);
  };

  const removeLigne = (index: number) => {
    setLignes((prev) => prev.filter((_, i) => i !== index));
  };

  const total = useMemo(
    () =>
      lignes.reduce(
        (sum, l) => sum + l.quantite * l.prixUnitaire,
        0,
      ),
    [lignes],
  );

  const handleSubmit = async () => {
    setError('');
    if (!user?.id) {
      setError("Utilisateur non connecté. Merci de vous reconnecter.");
      return;
    }
    if (type === 'ACHAT' && !fournisseurId) {
      setError('Le fournisseur est obligatoire pour un achat.');
      return;
    }
    if (!entrepotId) {
      setError("L'entrepôt est obligatoire.");
      return;
    }
    if (!lignes.length || lignes.some((l) => !l.produitId || l.quantite <= 0)) {
      setError('Chaque ligne doit avoir un produit et une quantite > 0.');
      return;
    }

    setSaving(true);
    try {
      const commandeRes = await commandesApi.create({
        type,
        etat: 'EN_COURS',
        userId: user.id,
        fournisseurId: type === 'ACHAT' ? fournisseurId : undefined,
        entrepotId,
      });
      const commandeId = (commandeRes.data as { id: string }).id;

      await Promise.all(
        lignes.map((l) =>
          commandeLignesApi.create({
            commandeId,
            produitId: l.produitId,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
          }),
        ),
      );

      navigate(`/commandes/${commandeId}`);
    } catch (e: unknown) {
      const message =
        typeof e === 'object' &&
        e !== null &&
        'response' in e &&
        typeof (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message !==
          'undefined'
          ? (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : undefined;
      setError(Array.isArray(message) ? message.join(' — ') : (message ?? 'Erreur lors de la creation.'));
    } finally {
      setSaving(false);
    }
  };

  const handleBarcodeLookup = async (index: number) => {
    const codeBare = lignes[index].codeBare.trim();
    if (!codeBare) return;
    try {
      const res = await produitsApi.lookupByCodeBare(codeBare);
      const produit = res.data as { id: string; prixAchatMoyen?: number; prixVente?: number };
      setLigne(index, {
        produitId: produit.id,
        prixUnitaire: type === 'ACHAT' ? (produit.prixAchatMoyen ?? 0) : (produit.prixVente ?? 0),
      });
    } catch {
      setError(`Code-barres introuvable: ${codeBare}`);
    }
  };

  const handleShowQr = async (index: number) => {
    const codeBare = lignes[index].codeBare.trim();
    if (!codeBare) {
      setError('Veuillez saisir un code-barres pour générer le QR.');
      return;
    }
    try {
      const res = await produitsApi.qrCodeByCodeBare(codeBare);
      const qr = res.data as { qrCodeDataUrl: string; codeBare: string };
      const popup = window.open('', '_blank');
      if (!popup) return;
      popup.document.write(`
        <html>
          <head><title>QR Code ${qr.codeBare}</title></head>
          <body style="font-family: Arial, sans-serif; text-align:center; padding:24px;">
            <h3>QR Code - ${qr.codeBare}</h3>
            <img src="${qr.qrCodeDataUrl}" alt="QR Code" />
          </body>
        </html>
      `);
      popup.document.close();
    } catch {
      setError(`Impossible de générer le QR pour le code: ${codeBare}`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spinner size={40} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon="➕"
        title="Nouvelle commande"
        subtitle={type === 'ACHAT' ? "Création d'une commande d'achat" : "Création d'une commande de vente"}
        actions={
          <button className="btn-secondary" onClick={() => navigate('/commandes')}>
            ← Retour
          </button>
        }
      />

      {(!fournisseurs.length || !entrepots.length || !produits.length) && (
        <EmptyState
          icon="⚠️"
          title="Donnees insuffisantes"
          subtitle="Ajoutez au moins un fournisseur, un entrepot et un produit avant de creer une commande."
        />
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      <div className="chart-card" style={{ marginBottom: 18 }}>
        <p className="chart-title">Informations générales</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div className="field-group">
            <label className="field-label">Type de commande *</label>
            <select
              className="field-select"
              value={type}
              onChange={(e) => {
                const newType = e.target.value as 'ACHAT' | 'VENTE';
                setType(newType);
                if (newType === 'VENTE') setFournisseurId('');
              }}
            >
              <option value="ACHAT">📦 ACHAT</option>
              <option value="VENTE">🛒 VENTE</option>
            </select>
          </div>
          {type === 'ACHAT' && (
            <div className="field-group">
              <label className="field-label">Fournisseur *</label>
              <select
                className="field-select"
                value={fournisseurId}
                onChange={(e) => setFournisseurId(e.target.value)}
              >
                <option value="">Sélectionner...</option>
                {fournisseurs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field-group">
            <label className="field-label">Entrepôt {type === 'ACHAT' ? 'destination' : 'source'} *</label>
            <select
              className="field-select"
              value={entrepotId}
              onChange={(e) => setEntrepotId(e.target.value)}
            >
              <option value="">Selectionner...</option>
              {entrepots.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p className="chart-title" style={{ marginBottom: 0 }}>Lignes produits</p>
          <button className="btn-primary-sm" onClick={addLigne}>+ Ajouter ligne</button>
        </div>

        <div className="table-wrapper" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Code-barres</th>
                <th>Quantite</th>
                <th>Prix unitaire ({type === 'ACHAT' ? 'Achat' : 'Vente'})</th>
                <th>Total ligne</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, index) => (
                <tr key={`${l.produitId}-${index}`} className="table-row">
                  <td>
                    <select
                      className="field-select"
                      value={l.produitId}
                      onChange={(e) => {
                        const selected = produits.find((p) => p.id === e.target.value);
                        setLigne(index, {
                          produitId: e.target.value,
                          codeBare: selected?.codeBare ?? '',
                          prixUnitaire: type === 'ACHAT' ? (selected?.prixAchatMoyen ?? 0) : (selected?.prixVente ?? 0),
                        });
                      }}
                    >
                      <option value="">Selectionner...</option>
                      {produits.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nom}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="field-input"
                        placeholder="Scanner/saisir code..."
                        value={l.codeBare}
                        onChange={(e) => setLigne(index, { codeBare: e.target.value })}
                        onBlur={() => void handleBarcodeLookup(index)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleBarcodeLookup(index);
                          }
                        }}
                      />
                      <button
                        className="btn-secondary"
                        style={{ padding: '5px 10px', fontSize: 12 }}
                        onClick={() => void handleBarcodeLookup(index)}
                      >
                        🔎
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '5px 10px', fontSize: 12 }}
                        onClick={() => void handleShowQr(index)}
                      >
                        QR
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '5px 10px', fontSize: 12 }}
                        onClick={() => setScannerIndex(index)}
                        title="Scanner avec la caméra"
                      >
                        📷
                      </button>
                    </div>
                  </td>
                  <td>
                    <input
                      className="field-input"
                      type="number"
                      min={1}
                      value={l.quantite}
                      onChange={(e) =>
                        setLigne(index, { quantite: Number.parseInt(e.target.value || '0', 10) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="field-input"
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.prixUnitaire}
                      onChange={(e) =>
                        setLigne(index, { prixUnitaire: Number.parseFloat(e.target.value || '0') })
                      }
                    />
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                    {(l.quantite * l.prixUnitaire).toFixed(2)} DT
                  </td>
                  <td>
                    <button
                      className="btn-danger"
                      style={{ padding: '5px 10px', fontSize: 12 }}
                      onClick={() => removeLigne(index)}
                      disabled={lignes.length === 1}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 18 }}>
            Total: <span style={{ color: 'var(--success)' }}>{total.toFixed(2)} DT</span>
          </strong>
          <button className="btn-primary-sm" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creation...' : 'Creer la commande'}
          </button>
        </div>
      </div>

      <BarcodeScanner
        open={scannerIndex !== null}
        onClose={() => setScannerIndex(null)}
        onScan={(code) => {
          if (scannerIndex !== null) {
            setLigne(scannerIndex, { codeBare: code });
            void handleBarcodeLookup(scannerIndex);
            setScannerIndex(null);
          }
        }}
        title="Scanner un code-barres"
      />
    </div>
  );
}

