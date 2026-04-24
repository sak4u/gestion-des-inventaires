// Placeholder dashboard — will be fully built later
export default function DashboardPage() {
  const user = JSON.parse(localStorage.getItem('user') ?? '{}');

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: 'rgba(13,21,40,0.9)',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: 18,
        padding: '48px 56px',
        textAlign: 'center',
        maxWidth: 480,
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>📦</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
          Bienvenue, {user?.name ?? 'Utilisateur'} !
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 8 }}>
          Rôle : <span style={{
            background: 'rgba(59,130,246,0.15)',
            color: '#60a5fa',
            borderRadius: 6,
            padding: '2px 10px',
            fontWeight: 600,
            fontSize: 13,
          }}>{user?.role?.name ?? '—'}</span>
        </p>
        <p style={{ color: '#475569', fontSize: 13, marginBottom: 32 }}>
          Le tableau de bord complet sera disponible prochainement.
        </p>
        <button
          onClick={handleLogout}
          style={{
            padding: '11px 28px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
