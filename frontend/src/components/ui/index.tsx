// ── KpiCard ───────────────────────────────────────────────────────────────────
export interface KpiCardProps {
  icon: string;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: 'blue' | 'green' | 'orange' | 'red';
}

export function KpiCard({ icon, label, value, trend, trendValue, color = 'blue' }: KpiCardProps) {
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const trendClass = trend === 'up' ? 'trend--up' : trend === 'down' ? 'trend--down' : 'trend--stable';

  return (
    <div className={`kpi-card kpi-card--${color}`}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-body">
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">{value}</p>
        {trend && trendValue && (
          <p className={`kpi-trend ${trendClass}`}>
            {trendIcon} {trendValue}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export type BadgeVariant =
  | 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray';

export function Badge({ children, variant = 'blue' }: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      aria-label="Chargement..."
    />
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, subtitle }: {
  icon?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">{icon}</span>
      <p className="empty-state-title">{title}</p>
      {subtitle && <p className="empty-state-subtitle">{subtitle}</p>}
    </div>
  );
}

// ── BarcodeScanner ────────────────────────────────────────────────────────────
export { default as BarcodeScanner } from './BarcodeScanner';

// ── InstallPWA ────────────────────────────────────────────────────────────────
export { default as InstallPWA } from './InstallPWA';

// ── SearchInput ───────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';

export function SearchInput({
  placeholder = 'Rechercher…',
  onSearch,
  debounce = 300,
}: {
  placeholder?: string;
  onSearch: (value: string) => void;
  debounce?: number;
}) {
  const [value, setValue] = useState('');

  const debouncedSearch = useCallback(
    (() => {
      let t: ReturnType<typeof setTimeout>;
      return (v: string) => {
        clearTimeout(t);
        t = setTimeout(() => onSearch(v), debounce);
      };
    })(),
    [onSearch, debounce],
  );

  useEffect(() => { debouncedSearch(value); }, [value, debouncedSearch]);

  return (
    <div className="search-input-wrapper">
      <span className="search-icon">🔍</span>
      <input
        className="search-input"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value && (
        <button className="search-clear" onClick={() => setValue('')}>✕</button>
      )}
    </div>
  );
}
