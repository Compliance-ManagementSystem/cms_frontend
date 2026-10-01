import React from 'react';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'pending'
  | 'expired';

type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600/50',
  success: 'bg-emerald-50 dark:bg-green-900/40 text-emerald-700 dark:text-green-400 border-emerald-200 dark:border-green-700/40',
  warning: 'bg-amber-50 dark:bg-yellow-900/40 text-amber-700 dark:text-yellow-400 border-amber-200 dark:border-yellow-700/40',
  danger:  'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700/40',
  info:    'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700/40',
  pending: 'bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-700/40',
  expired: 'bg-rose-50 dark:bg-red-950/60 text-rose-700 dark:text-red-500 border-rose-200 dark:border-red-800/40',
};

const dotStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-400',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  danger:  'bg-red-400',
  info:    'bg-blue-400',
  pending: 'bg-orange-400',
  expired: 'bg-red-500',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
};

const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  className = '',
}) => {
  return (
    <span
      className={[
        'inline-flex items-center font-medium rounded-full border',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ].join(' ')}
    >
      {dot && (
        <span
          className={`inline-block rounded-full ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'} ${dotStyles[variant]} animate-pulse`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
