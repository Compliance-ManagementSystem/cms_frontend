/**
 * The message to show for a caught error, or `fallback` when it has none.
 * API errors already carry the server's readable message (see api/axiosInstance.ts).
 */
export const getErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback;
