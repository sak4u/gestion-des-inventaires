import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLeftPanel } from '../components/AuthLeftPanel';
import api from '../api/client';

type Step = 'email' | 'code' | 'password' | 'done';

const STEPS: { key: Step; label: string }[] = [
  { key: 'email',    label: 'Email' },
  { key: 'code',     label: 'Code' },
  { key: 'password', label: 'Nouveau MDP' },
];

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="steps">
      {STEPS.map((s, i) => (
        <>
          <div
            key={s.key}
            className={`step ${current === 'done' || i < currentIdx ? 'done' : i === currentIdx ? 'active' : ''}`}
          >
            {current === 'done' || i < currentIdx ? '✓' : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div
              key={`line-${i}`}
              className={`step-line ${(current === 'done' || currentIdx > i) ? 'done' : ''}`}
            />
          )}
        </>
      ))}
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [step, setStep]       = useState<Step>('email');
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState('');
  const [newPwd, setNewPwd]   = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Step 1 — send reset code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Veuillez entrer votre adresse e-mail.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setStep('code');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erreur lors de l\'envoi du code.');
    } finally { setLoading(false); }
  };

  // Step 2 — validate code (we go straight to step 3, code is verified server-side on reset)
  const handleValidateCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.length !== 6) { setError('Le code doit contenir 6 chiffres.'); return; }
    setStep('password');
  };

  // Step 3 — reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPwd.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, code, newPassword: newPwd });
      setStep('done');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Code invalide ou expiré.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-layout">
      <AuthLeftPanel />

      <div className="auth-panel-right">
        <div className="auth-card">

          {step !== 'done' && (
            <>
              <div className="auth-card-header">
                <h2>Mot de passe oublié</h2>
                <p>
                  {step === 'email'    && 'Entrez votre email pour recevoir un code de réinitialisation.'}
                  {step === 'code'     && `Un code à 6 chiffres a été envoyé à ${email}.`}
                  {step === 'password' && 'Définissez votre nouveau mot de passe.'}
                </p>
              </div>
              <StepIndicator current={step} />
            </>
          )}

          {error && <div className="alert alert-error">⚠️ {error}</div>}

          {/* ─── Step 1 : Email ─── */}
          {step === 'email' && (
            <form onSubmit={handleSendCode} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="fp-email">Adresse e-mail</label>
                <div className="input-wrapper">
                  <span className="input-icon">✉️</span>
                  <input id="fp-email" type="email" className="form-input"
                    placeholder="vous@exemple.com"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <><span className="spinner" /> Envoi...</> : '→ Envoyer le code'}
              </button>
              <div className="auth-link-row" style={{ marginTop: 16 }}>
                <Link to="/login" className="btn-ghost">← Retour à la connexion</Link>
              </div>
            </form>
          )}

          {/* ─── Step 2 : Code ─── */}
          {step === 'code' && (
            <form onSubmit={handleValidateCode} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="fp-code">Code de vérification</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔑</span>
                  <input
                    id="fp-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="form-input"
                    placeholder="_ _ _ _ _ _"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    style={{ letterSpacing: '0.4em', fontWeight: 600, fontSize: 18, textAlign: 'center' }}
                    required
                  />
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, textAlign: 'center' }}>
                Vous n'avez pas reçu le code ?{' '}
                <button type="button" className="btn-ghost" onClick={() => { setStep('email'); setCode(''); }}>
                  Renvoyer
                </button>
              </p>
              <button type="submit" className="btn-primary" disabled={code.length !== 6}>
                → Vérifier le code
              </button>
            </form>
          )}

          {/* ─── Step 3 : New Password ─── */}
          {step === 'password' && (
            <form onSubmit={handleResetPassword} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="fp-newpwd">Nouveau mot de passe</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    id="fp-newpwd"
                    type={showPwd ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Minimum 8 caractères"
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    required
                  />
                  <button type="button" className="input-action" onClick={() => setShowPwd(v => !v)}>
                    {showPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <><span className="spinner" /> Réinitialisation...</> : '✓ Réinitialiser le mot de passe'}
              </button>
            </form>
          )}

          {/* ─── Done ─── */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontSize: 22, marginBottom: 8 }}>Mot de passe réinitialisé !</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: 14 }}>
                Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter.
              </p>
              <Link to="/login">
                <button className="btn-primary" style={{ width: 'auto', padding: '12px 32px' }}>
                  → Se connecter
                </button>
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
