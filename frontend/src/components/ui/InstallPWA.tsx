import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Detect if already installed (standalone)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => setIsInstalled(true);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) return null;

  // Android/Chrome: show install button
  if (deferredPrompt) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 9998,
          background: 'var(--card-bg, #1e293b)',
          border: '1px solid var(--border, #334155)',
          borderRadius: 14,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text-primary, #f1f5f9)' }}>
            📲 Installer l'application
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
            Accès rapide depuis l'écran d'accueil
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setDeferredPrompt(null)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border, #334155)',
              color: 'var(--text-muted, #94a3b8)',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Plus tard
          </button>
          <button
            onClick={() => void handleInstall()}
            style={{
              background: '#3b82f6',
              border: 'none',
              color: '#fff',
              borderRadius: 10,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Installer
          </button>
        </div>
      </div>
    );
  }

  // iOS: show manual instructions
  if (isIOS) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 9998,
          background: 'var(--card-bg, #1e293b)',
          border: '1px solid var(--border, #334155)',
          borderRadius: 14,
          padding: '14px 18px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text-primary, #f1f5f9)' }}>
              📲 Installer sur iPhone
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted, #94a3b8)', lineHeight: 1.5 }}>
              Appuyez sur <strong style={{ color: '#3b82f6' }}>Partager ⬆️</strong> puis sur <strong style={{ color: '#3b82f6' }}>"Sur l'écran d'accueil"</strong>
            </p>
          </div>
          <button
            onClick={() => setIsInstalled(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              fontSize: 18,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
            }}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return null;
}
