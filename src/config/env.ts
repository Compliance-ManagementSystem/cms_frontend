
const env = {

  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL ,
  IS_DEV: import.meta.env.DEV as boolean,
  MODE: import.meta.env.MODE as string,
} as const;

export default env;
