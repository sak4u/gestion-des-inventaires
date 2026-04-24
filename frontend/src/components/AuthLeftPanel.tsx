// Warehouse SVG decorative element for left panel
export const WarehouseIllustration = () => (
  <svg width="220" height="180" viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.7 }}>
    {/* Ground */}
    <rect x="10" y="150" width="200" height="4" rx="2" fill="#1d4ed8" opacity="0.4"/>
    {/* Warehouse body */}
    <rect x="30" y="80" width="160" height="74" rx="4" fill="#0f2d5e" stroke="#2563eb" strokeWidth="1.5"/>
    {/* Roof */}
    <path d="M20 82 L110 30 L200 82" stroke="#3b82f6" strokeWidth="2" fill="#091e42"/>
    {/* Door */}
    <rect x="88" y="108" width="44" height="46" rx="3" fill="#0a1a38" stroke="#1e40af" strokeWidth="1.5"/>
    {/* Door lines */}
    <line x1="110" y1="108" x2="110" y2="154" stroke="#2563eb" strokeWidth="1" opacity="0.5"/>
    <circle cx="116" cy="132" r="3" fill="#3b82f6"/>
    {/* Windows */}
    <rect x="44" y="102" width="30" height="22" rx="3" fill="#0a1a38" stroke="#1e40af" strokeWidth="1.5"/>
    <rect x="146" y="102" width="30" height="22" rx="3" fill="#0a1a38" stroke="#1e40af" strokeWidth="1.5"/>
    {/* Window cross */}
    <line x1="59" y1="102" x2="59" y2="124" stroke="#2563eb" strokeWidth="1" opacity="0.5"/>
    <line x1="44" y1="113" x2="74" y2="113" stroke="#2563eb" strokeWidth="1" opacity="0.5"/>
    <line x1="161" y1="102" x2="161" y2="124" stroke="#2563eb" strokeWidth="1" opacity="0.5"/>
    <line x1="146" y1="113" x2="176" y2="113" stroke="#2563eb" strokeWidth="1" opacity="0.5"/>
    {/* Crates */}
    <rect x="170" y="130" width="20" height="18" rx="2" fill="#1d4ed8" stroke="#3b82f6" strokeWidth="1" opacity="0.8"/>
    <rect x="176" y="120" width="20" height="18" rx="2" fill="#1e40af" stroke="#3b82f6" strokeWidth="1" opacity="0.6"/>
    <rect x="10" y="132" width="18" height="18" rx="2" fill="#1d4ed8" stroke="#3b82f6" strokeWidth="1" opacity="0.8"/>
    {/* Glow dot on top */}
    <circle cx="110" cy="30" r="5" fill="#3b82f6" opacity="0.8"/>
    <circle cx="110" cy="30" r="10" fill="#3b82f6" opacity="0.15"/>
  </svg>
);

// Left panel branding component
export const AuthLeftPanel = () => (
  <div className="auth-panel-left">
    <div className="brand-logo">
      <div className="brand-logo-icon">📦</div>
      <div className="brand-logo-text">
        <strong>InventiQ</strong>
        <span>Gestion Intelligente</span>
      </div>
    </div>

    <div className="brand-headline">
      <h1>
        Gérez votre stock<br />
        avec <span>intelligence</span>
      </h1>
      <p>
        Plateforme complète de gestion des inventaires avec prédiction IA,
        réapprovisionnement automatique et alertes en temps réel.
      </p>
    </div>

    <div className="brand-features">
      {[
        { icon: '🤖', text: 'Prédictions IA basées sur l\'historique' },
        { icon: '📊', text: 'Tableau de bord analytique en temps réel' },
        { icon: '🔔', text: 'Alertes de rupture de stock automatiques' },
        { icon: '🚛', text: 'Gestion des fournisseurs & commandes' },
      ].map(({ icon, text }) => (
        <div className="brand-feature" key={text}>
          <div className="brand-feature-icon">{icon}</div>
          <span>{text}</span>
        </div>
      ))}
    </div>

    <div style={{ position: 'relative', zIndex: 1, marginTop: 40 }}>
      <WarehouseIllustration />
    </div>
  </div>
);
