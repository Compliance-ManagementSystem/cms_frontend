import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftAddon,
      rightAddon,
      fullWidth = false,
      id,
      className = '',
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {label}
            {props.required && (
              <span className="text-red-500 dark:text-red-400 ml-0.5" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative flex items-center">
          {leftAddon && (
            <div className="absolute left-3 text-slate-400 dark:text-slate-400 pointer-events-none">
              {leftAddon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={[
              'w-full rounded-lg border bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100',
              'placeholder:text-slate-400 dark:placeholder:text-slate-500',
              'transition-all duration-150 ease-in-out',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600',
              leftAddon ? 'pl-10' : 'pl-3',
              rightAddon ? 'pr-10' : 'pr-3',
              'py-2 text-sm shadow-sm dark:shadow-none',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />

          {rightAddon && (
            <div className="absolute right-3 text-slate-400 dark:text-slate-400 pointer-events-none">
              {rightAddon}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1" role="alert">
            {error}
          </p>
        )}
        {!error && hint && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
