import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

export default function BarcodeScanner({ open, onClose, onScan, title = 'Scanner un code-barres' }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState('');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const stopScan = useCallback(() => {
    try {
      readerRef.current?.reset();
    } catch {
      // ignore
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    trackRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stopScan();
      setError('');
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        const devices = await reader.listVideoInputDevices();
        if (cancelled) return;

        setCameras(devices);

        // Prefer back camera on mobile
        const back = devices.find((d) => /back|rear|environment/i.test(d.label));
        const chosen = back?.deviceId ?? devices[0]?.deviceId ?? '';
        setSelectedCamera(chosen);

        if (!chosen) {
          setError('Aucune caméra détectée.');
          return;
        }

        setScanning(true);
        setError('');

        await reader.decodeFromVideoDevice(chosen, videoRef.current!, (result, err) => {
          if (result) {
            const text = result.getText();
            onScan(text);
            stopScan();
            onClose();
          }
          if (err && !(err instanceof NotFoundException)) {
            // eslint-disable-next-line no-console
            console.warn('Scanner error:', err);
          }
        });

        // Grab track for torch control
        const stream = videoRef.current?.srcObject as MediaStream | null;
        const videoTrack = stream?.getVideoTracks()[0] ?? null;
        trackRef.current = videoTrack ?? null;
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? 'Erreur caméra');
          setScanning(false);
        }
      }
    };

    void init();

    return () => {
      cancelled = true;
      stopScan();
    };
  }, [open, onScan, onClose, stopScan]);

  const switchCamera = async (deviceId: string) => {
    stopScan();
    setSelectedCamera(deviceId);
    setScanning(true);
    setError('');
    try {
      await readerRef.current?.decodeFromVideoDevice(deviceId, videoRef.current!, (result, err) => {
        if (result) {
          onScan(result.getText());
          stopScan();
          onClose();
        }
        if (err && !(err instanceof NotFoundException)) {
          // eslint-disable-next-line no-console
          console.warn('Scanner error:', err);
        }
      });
      const stream = videoRef.current?.srcObject as MediaStream | null;
      trackRef.current = stream?.getVideoTracks()[0] ?? null;
    } catch (e: any) {
      setError(e?.message ?? 'Erreur caméra');
      setScanning(false);
    }
  };

  const toggleTorch = async () => {
    const track = trackRef.current;
    if (!track) return;
    try {
      const capabilities = track.getCapabilities() as any;
      if (!capabilities?.torch) {
        setError('Lampe torche non supportée sur cette caméra.');
        return;
      }
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next }] } as any);
      setTorchOn(next);
    } catch (e: any) {
      setError(e?.message ?? 'Impossible de toggler la lampe');
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          gap: 12,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
        <button
          onClick={() => {
            stopScan();
            onClose();
          }}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#fff',
            borderRadius: 8,
            width: 40,
            height: 40,
            fontSize: 20,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>

      {/* Video area */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />

        {/* Overlay viewfinder */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 'min(70vw, 320px)',
              height: 'min(35vw, 180px)',
              border: '3px solid rgba(255,255,255,0.8)',
              borderRadius: 12,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
            }}
          />
        </div>

        {scanning && (
          <div
            style={{
              position: 'absolute',
              bottom: 80,
              left: 0,
              right: 0,
              textAlign: 'center',
              color: '#fff',
              fontSize: 14,
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              padding: '0 20px',
            }}
          >
            Placez le code-barres dans le cadre
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          padding: '14px 16px 24px',
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {error && (
          <div
            style={{
              color: '#ef4444',
              fontSize: 13,
              textAlign: 'center',
              background: 'rgba(239,68,68,0.12)',
              padding: '8px 10px',
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {cameras.length > 1 && (
            <select
              value={selectedCamera}
              onChange={(e) => void switchCamera(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
                minWidth: 160,
              }}
            >
              {cameras.map((c) => (
                <option key={c.deviceId} value={c.deviceId} style={{ color: '#000' }}>
                  {c.label || `Caméra ${c.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => void toggleTorch()}
            style={{
              background: torchOn ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.12)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 10,
              padding: '10px 16px',
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {torchOn ? '🔦 On' : '🔦 Off'}
          </button>
        </div>
      </div>
    </div>
  );
}
