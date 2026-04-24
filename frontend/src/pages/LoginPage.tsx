import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLeftPanel } from '../components/AuthLeftPanel';
import api from '../api/client';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Veuillez remplir tous les champs.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('access_token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <AuthLeftPanel />

      <div className="auth-panel-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Connexion</h2>
            <p>Bienvenue ! Connectez-vous pour accéder à votre espace.</p>
          </div>

          {error && <div className="alert alert-error">⚠️ {error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Adresse e-mail</label>
              <div className="input-wrapper">
                <span className="input-icon">✉️</span>
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label className="form-label" htmlFor="login-pwd" style={{ marginBottom: 0 }}>Mot de passe</label>
                <Link to="/forgot-password" className="btn-ghost" style={{ fontSize: 12 }}>
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="login-pwd"
                  type={showPwd ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button type="button" className="input-action" onClick={() => setShowPwd(v => !v)}>
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> Connexion...</> : '→ Se connecter'}
            </button>
          </form>

          <div className="auth-link-row">
            Pas encore de compte ?{' '}
            <Link to="/register" className="btn-ghost">Créer un compte</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
