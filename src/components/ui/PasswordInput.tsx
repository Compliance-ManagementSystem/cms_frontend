import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Input from '@/components/ui/Input';

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type' | 'rightAddon'>;

/** A password field with an eye button to show or hide what was typed */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      ref={ref}
      type={visible ? 'text' : 'password'}
      rightAddon={
        // The addon slot ignores clicks; the button opts back in
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="pointer-events-auto flex items-center p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
    />
  );
});

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
