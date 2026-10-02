
const env = {

  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL ,
  IS_DEV: import.meta.env.DEV as boolean,
  MODE: import.meta.env.MODE as string,
  // Quick-login buttons for the sample accounts; set VITE_SHOW_DEMO_LOGIN=false to hide them
  SHOW_DEMO_LOGIN: import.meta.env.VITE_SHOW_DEMO_LOGIN !== 'false',
} as const;

export default env;
