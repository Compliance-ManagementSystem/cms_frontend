import React from 'react';

/** Error message under a form field that is not an <Input> (select, textarea, checkbox group). */
const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <p className="mt-1.5 text-xs text-red-500 dark:text-red-400" role="alert">
      {message}
    </p>
  ) : null;

/** Border classes for a native field: red when it has an error. */
export const fieldBorder = (error?: string) =>
  error ? 'border-red-500 dark:border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700';

export default FieldError;
