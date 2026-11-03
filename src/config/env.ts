const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL,
  IS_DEV: import.meta.env.DEV as boolean,
  MODE: import.meta.env.MODE as string,
  // The client's branding; without these the app uses its default name and icon
  APP_NAME: (import.meta.env.VITE_APP_NAME as string | undefined) || 'Compliance Management System',
  APP_LOGO_URL: import.meta.env.VITE_APP_LOGO_URL as string | undefined,
} as const;

export default env;
