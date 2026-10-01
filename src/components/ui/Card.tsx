import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  id?: string;
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

interface CardStatProps {
  label: string;
  value: string | number;
  change?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  iconBg?: string;
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

// ── Card Header ────────────────────────────────────────────────────────────────
const CardHeader: React.FC<CardHeaderProps> = ({ title, description, action, icon }) => (
  <div className="flex items-start justify-between mb-4">
    <div className="flex items-center gap-3">
      {icon && (
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">{icon}</div>
      )}
      <div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

// ── Stat Card ──────────────────────────────────────────────────────────────────
const CardStat: React.FC<CardStatProps> = ({ label, value, change, icon, iconBg }) => (
  <Card className="flex items-start gap-4">
    {icon && (
      <div
        className={`p-3 rounded-xl flex-shrink-0 ${iconBg || 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'}`}
      >
        {icon}
      </div>
    )}
    <div className="min-w-0">
      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{value}</p>
      {change && (
        <p
          className={`text-xs mt-1 font-medium ${
            change.direction === 'up'
              ? 'text-green-600 dark:text-green-400'
              : change.direction === 'down'
              ? 'text-red-600 dark:text-red-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {change.direction === 'up' ? '↑' : change.direction === 'down' ? '↓' : '→'}{' '}
          {change.value}
        </p>
      )}
    </div>
  </Card>
);

// ── Base Card + compound components ───────────────────────────────────────────
type CardComponent = React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Stat: React.FC<CardStatProps>;
};

const Card: CardComponent = ({
  children,
  className = '',
  hover = false,
  glass = false,
  padding = 'md',
  id,
}) => {
  return (
    <div
      id={id}
      className={[
        'rounded-xl border border-slate-200 dark:border-slate-800',
        glass
          ? 'glass'
          : 'bg-white dark:bg-slate-900/60 backdrop-blur-sm shadow-sm dark:shadow-none',
        hover
          ? 'hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200 cursor-pointer'
          : '',
        paddingStyles[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Stat = CardStat;

export default Card;
