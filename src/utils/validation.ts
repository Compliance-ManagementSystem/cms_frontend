/**
 * Form validation helpers.
 *
 * Field rules mirror the API's (server/src/validations), with the same
 * messages, so a form rejects a value before the server would. Errors are a
 * flat map from the field's path ("address.city") to its message, and are
 * shown under the field.
 */

import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import axios from 'axios';
import { z } from 'zod';

export type FieldErrors = Record<string, string>;

// ── Field rules ───────────────────────────────────────────────────────────────

const trimmed = () => z.string().trim();

/** A required text field */
export const required = (label: string) => trimmed().min(1, `${label} is required`);

export const email = trimmed().min(1, 'Email is required').email('Enter a valid email address');
export const optionalEmail = trimmed().email('Enter a valid email address').or(z.literal(''));

/** 10–13 digits, optionally with +, spaces, dashes or brackets */
export const phone = trimmed()
  .min(1, 'Phone number is required')
  .refine((value) => {
    const digits = value.replace(/\D/g, '');
    return /^\+?[\d\s()-]+$/.test(value) && digits.length >= 10 && digits.length <= 13;
  }, 'Enter a valid phone number (10 digits, optionally with country code)');
export const optionalPhone = phone.or(z.literal(''));

export const optionalPincode = trimmed()
  .regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code')
  .or(z.literal(''));

export const optionalGstin = trimmed()
  .toUpperCase()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    'Enter a valid 15-character GSTIN, e.g. 27AAAAA0000A1Z5'
  )
  .or(z.literal(''));

export const optionalPan = trimmed()
  .toUpperCase()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Enter a valid 10-character PAN, e.g. AAAAA0000A')
  .or(z.literal(''));

export const optionalCin = trimmed()
  .toUpperCase()
  .regex(/^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/, 'Enter a valid 21-character CIN, e.g. U72200MH2020PTC123456')
  .or(z.literal(''));

export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/** Letters, numbers, dashes and underscores, e.g. an entity code */
export const optionalCode = (label: string, min = 2, max = 20) =>
  trimmed()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`)
    .regex(/^[A-Za-z0-9_-]+$/, `${label} may only contain letters, numbers, dashes and underscores`)
    .or(z.literal(''));

export const maxLength = (label: string, max: number) =>
  z.string().max(max, `${label} must be at most ${max} characters`);

/** Adds an error when `later` is before `earlier` (both optional date strings). */
export const dateOrder =
  <T extends Record<string, unknown>>(earlierKey: keyof T & string, laterKey: keyof T & string, message: string) =>
  (values: T, ctx: z.RefinementCtx) => {
    const earlier = values[earlierKey];
    const later = values[laterKey];
    if (typeof earlier === 'string' && typeof later === 'string' && earlier && later && later < earlier) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [laterKey], message });
    }
  };

// ── Running a schema ──────────────────────────────────────────────────────────

/** Validates `values`; returns the first message for each invalid field (empty when valid). */
export const validateForm = (schema: z.ZodTypeAny, values: unknown): FieldErrors => {
  const result = schema.safeParse(values);
  if (result.success) return {};
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    if (!(path in errors)) errors[path] = issue.message;
  }
  return errors;
};

/** Field errors from an API error response (422 validation, 409 duplicate). */
export const getServerFieldErrors = (err: unknown): FieldErrors => {
  if (!axios.isAxiosError<{ errors?: unknown }>(err)) return {};
  const list = err.response?.data?.errors;
  if (!Array.isArray(list)) return {};
  const errors: FieldErrors = {};
  for (const item of list) {
    if (item && typeof item.field === 'string' && item.field && typeof item.message === 'string') {
      if (!(item.field in errors)) errors[item.field] = item.message;
    }
  }
  return errors;
};

/** Scrolls to and focuses the first invalid field, found by its `name` attribute. */
export const focusFirstError = (errors: FieldErrors, root: ParentNode = document) => {
  for (const field of Object.keys(errors)) {
    const element = root.querySelector<HTMLElement>(`[name="${CSS.escape(field)}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus({ preventScroll: true });
      return;
    }
  }
};

/**
 * Error state for a form: run `validate(schema, values)` on submit, show
 * `errors[field]` under each field, and call `clear(field)` when it changes.
 * `serverErrors` (from getServerFieldErrors) are merged in when they arrive.
 */
export const useFormErrors = (serverErrors?: FieldErrors) => {
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (serverErrors && Object.keys(serverErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...serverErrors }));
      focusFirstError(serverErrors);
    }
  }, [serverErrors]);

  /** Validates and shows errors; returns true when the values are valid. */
  const validate = useCallback((schema: z.ZodTypeAny, values: unknown): boolean => {
    const found = validateForm(schema, values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError(found);
      return false;
    }
    return true;
  }, []);

  const clear = useCallback((...fields: string[]) => {
    setErrors((prev) => {
      if (!fields.some((field) => field in prev)) return prev;
      const next = { ...prev };
      fields.forEach((field) => delete next[field]);
      return next;
    });
  }, []);

  return { errors, setErrors, validate, clear };
};

// ── File uploads ──────────────────────────────────────────────────────────────

/** Mirrors the API's upload limits (server/src/middlewares/upload.middleware.ts) */
export const MAX_UPLOAD_MB = 15;
const UPLOAD_EXTENSIONS = ['pdf'];

/** For a file input's `accept` attribute */
export const UPLOAD_ACCEPT = UPLOAD_EXTENSIONS.map((ext) => `.${ext}`).join(',');

/** Why a file cannot be uploaded, or null when it can. */
export const checkUploadFile = (file: File): string | null => {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!UPLOAD_EXTENSIONS.includes(extension)) {
    return `"${file.name}" is not a PDF. Only PDF files can be uploaded.`;
  }
  if (file.size === 0) {
    return `"${file.name}" is empty. Choose another file.`;
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). The maximum size is ${MAX_UPLOAD_MB} MB.`;
  }
  return null;
};

/**
 * The file chosen in a file input, or null. An unsupported file is rejected
 * straight away (with `onError`) and the input is cleared, instead of failing
 * only after the whole file has been uploaded.
 */
export const pickUploadFile = (
  event: ChangeEvent<HTMLInputElement>,
  onError: (message: string) => void
): File | null => {
  const file = event.target.files?.[0] ?? null;
  if (!file) return null;
  const problem = checkUploadFile(file);
  if (problem) {
    onError(problem);
    event.target.value = '';
    return null;
  }
  return file;
};
