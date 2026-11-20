/**
 * Change Password
 *
 * Lets the signed-in user change their own password. The current password is
 * required; other devices are signed out and this one stays signed in.
 */

import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { password, useFormErrors, getServerFieldErrors } from '@/utils/validation';
import { getErrorMessage } from '@/utils/errors';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: password,
    confirmPassword: z.string().min(1, 'Enter the new password again'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The two new passwords do not match',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current password',
  });

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { changePassword } = useAuth();
  const toast = useToast();
  const { errors, setErrors, validate, clear } = useFormErrors();
  const [values, setValues] = useState(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (key: keyof typeof EMPTY, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    clear(key);
    setFormError(null);
  };

  const handleClose = () => {
    setValues(EMPTY);
    setErrors({});
    setFormError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(schema, values)) return;

    setIsSubmitting(true);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      toast.success('Password changed. Other devices have been signed out.');
      handleClose();
    } catch (err) {
      setErrors(getServerFieldErrors(err));
      setFormError(getErrorMessage(err, 'Could not change your password'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Password"
      description="Enter your current password, then choose a new one."
      size="md"
      id="change-password-modal"
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Current Password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          leftAddon={<Lock size={15} />}
          value={values.currentPassword}
          error={errors.currentPassword}
          onChange={(e) => setField('currentPassword', e.target.value)}
        />
        <Input
          label="New Password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          leftAddon={<Lock size={15} />}
          hint="At least 8 characters, with an uppercase letter, a lowercase letter and a number."
          value={values.newPassword}
          error={errors.newPassword}
          onChange={(e) => setField('newPassword', e.target.value)}
        />
        <Input
          label="Confirm New Password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          leftAddon={<Lock size={15} />}
          value={values.confirmPassword}
          error={errors.confirmPassword}
          onChange={(e) => setField('confirmPassword', e.target.value)}
        />

        {formError && (
          <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
            {formError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 mt-2 pt-4 border-t border-slate-200 dark:border-slate-700/60">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            Change Password
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;
