import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLeftPanel } from '../components/AuthLeftPanel';
import api from '../api/client';
import { User, Mail, Lock, EyeOff, Eye, Tag, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const ROLES = [
  { value: 'ADMINISTRATEUR',    label: 'Administrateur',           desc: 'Gestion totale : utilisateurs, entrepôts, produits' },
  { value: 'GESTIONNAIRE_STOCK', label: 'Gestionnaire de Stock',   desc: 'Entrées/sorties, transferts, consultation du stock' },
  { value: 'RESPONSABLE_APPRO', label: 'Responsable Appro.',       desc: 'Prédictions IA, commandes d\'achat, fournisseurs' },
  { value: 'FOURNISSEUR',       label: 'Fournisseur',              desc: 'Consultation des commandes reçues, livraisons' },
];

function getStrength(pwd: string): number {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', roleName: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  const strength = getStrength(form.password);
  const strengthLabel = ['', 'Faible', 'Moyen', 'Bon', 'Fort'][strength];
  const strengthClass  = ['', 'weak',  'medium', 'strong', 'strong'][strength];

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.name || !form.email || !form.password || !form.roleName) {
      setError('Veuillez remplir tous les champs.'); return;
    }
    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.'); return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      setSuccess('Compte créé avec succès ! Redirection...');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' — ') : (msg ?? 'Erreur lors de la création du compte.'));
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLES.find(r => r.value === form.roleName);

  return (
    <div className="auth-layout">
      <AuthLeftPanel />

      <div className="auth-panel-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Créer un compte</h2>
            <p>Rejoignez la plateforme de gestion intelligente des inventaires.</p>
          </div>

          {error   && <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={18} /> {error}</div>}
          {success && <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={18} /> {success}</div>}

          <form onSubmit={handleSubmit} noValidate>

            {/* Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">Nom complet</label>
              <div className="input-wrapper">
                <span className="input-icon" style={{ display: 'flex', alignItems: 'center' }}><User size={18} /></span>
                <input id="reg-name" type="text" className="form-input"
                  placeholder="Mohamed Sakly"
                  value={form.name} onChange={set('name')} required />
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Adresse e-mail</label>
              <div className="input-wrapper">
                <span className="input-icon" style={{ display: 'flex', alignItems: 'center' }}><Mail size={18} /></span>
                <input id="reg-email" type="email" className="form-input"
                  placeholder="vous@exemple.com"
                  value={form.email} onChange={set('email')} required />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-pwd">Mot de passe</label>
              <div className="input-wrapper">
                <span className="input-icon" style={{ display: 'flex', alignItems: 'center' }}><Lock size={18} /></span>
                <input id="reg-pwd" type={showPwd ? 'text' : 'password'} className="form-input"
                  placeholder="Minimum 8 caractères"
                  value={form.password} onChange={set('password')} required />
                <button type="button" className="input-action" onClick={() => setShowPwd(v => !v)}>
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.password.length > 0 && (
                <>
                  <div className="password-strength" style={{ marginTop: 8 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`strength-bar ${i <= strength ? strengthClass : ''}`} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Force : <span style={{ color: strength >= 3 ? 'var(--success)' : strength >= 2 ? 'var(--warning)' : 'var(--error)' }}>
                      {strengthLabel}
                    </span>
                  </p>
                </>
              )}
            </div>

            {/* Role */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-role">Rôle dans l'organisation</label>
              <div className="input-wrapper">
                <span className="input-icon" style={{ display: 'flex', alignItems: 'center' }}><Tag size={18} /></span>
                <select id="reg-role" className="form-select"
                  value={form.roleName} onChange={set('roleName')} required>
                  <option value="" disabled>Choisissez votre rôle…</option>
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              {selectedRole && (
                <p className="role-description" style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} /> {selectedRole.desc}
                </p>
              )}
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> Création...</> : '→ Créer mon compte'}
            </button>
          </form>

          <div className="auth-link-row">
            Déjà un compte ?{' '}
            <Link to="/login" className="btn-ghost">Se connecter</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
