import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: string;
}

export default function PageHeader({ title, subtitle, actions, icon }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        {icon && <span className="page-header-icon">{icon}</span>}
        <div>
          <h2 className="page-header-title">{title}</h2>
          {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}
