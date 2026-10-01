/**
 * Authentication Context and Provider
 *
 * Provides reactive authentication state, session storage, token refresh,
 * and capability checks (hasRole, hasPermission, can) across the frontend.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import axiosInstance from '../api/axiosInstance';
import type {
  AuthUser,
  AuthContextType,
  LoginResponseData,
  RoleCode,
} from '../types/auth';

const TOKEN_KEY = 'cms_access_token';
const REFRESH_TOKEN_KEY = 'cms_refresh_token';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  );
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Synchronize token into axiosInstance default headers
  const setAuthTokens = useCallback(
    (accessToken: string | null, refreshToken?: string | null) => {
      setToken(accessToken);
      if (accessToken) {
        localStorage.setItem(TOKEN_KEY, accessToken);
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      } else {
        localStorage.removeItem(TOKEN_KEY);
        delete axiosInstance.defaults.headers.common['Authorization'];
      }

      if (refreshToken !== undefined) {
        if (refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        } else {
          localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      }
    },
    []
  );

  // Logout action
  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      await axiosInstance.post('/auth/logout', { refreshToken }).catch(() => {});
    } finally {
      setUser(null);
      setPermissions([]);
      setAuthTokens(null, null);
    }
  }, [setAuthTokens]);

  // Initial load: restore session from /api/auth/me or try refresh token
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (!storedToken && !storedRefreshToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        if (storedToken) {
          axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const res = await axiosInstance.get('/auth/me');
          if (isMounted && res.data?.data) {
            setUser(res.data.data.user);
            setPermissions(res.data.data.permissions || []);
            setToken(storedToken);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        // Token might have expired, attempt refresh
      }

      // If accessToken failed or missing, try refreshToken
      if (storedRefreshToken) {
        try {
          const refreshRes = await axiosInstance.post('/auth/refresh', {
            refreshToken: storedRefreshToken,
          });

          if (isMounted && refreshRes.data?.data) {
            const { accessToken, refreshToken: newRefresh } = refreshRes.data.data;
            setAuthTokens(accessToken, newRefresh);

            // Fetch profile with fresh access token
            const profileRes = await axiosInstance.get('/auth/me', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (isMounted && profileRes.data?.data) {
              setUser(profileRes.data.data.user);
              setPermissions(profileRes.data.data.permissions || []);
            }
          }
        } catch {
          // Both tokens invalid
          if (isMounted) {
            setUser(null);
            setPermissions([]);
            setAuthTokens(null, null);
          }
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [setAuthTokens]);

  // Setup Axios 401 response interceptor for transparent token refreshing
  useEffect(() => {
    const interceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/auth/login') &&
          !originalRequest.url?.includes('/auth/refresh')
        ) {
          originalRequest._retry = true;
          const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

          if (storedRefreshToken) {
            try {
              const res = await axiosInstance.post('/auth/refresh', {
                refreshToken: storedRefreshToken,
              });

              if (res.data?.data?.accessToken) {
                const newAccessToken = res.data.data.accessToken;
                const newRefreshToken = res.data.data.refreshToken;
                setAuthTokens(newAccessToken, newRefreshToken);

                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                return axiosInstance(originalRequest);
              }
            } catch {
              // Refresh failed — purge auth state
              setUser(null);
              setPermissions([]);
              setAuthTokens(null, null);
              window.location.href = '/login';
            }
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axiosInstance.interceptors.response.eject(interceptor);
    };
  }, [setAuthTokens]);

  // Login action
  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const res = await axiosInstance.post('/auth/login', {
          email,
          password,
        });

        const data: LoginResponseData = res.data?.data;
        if (!data || !data.accessToken) {
          throw new Error('Malformed authentication response from server');
        }

        setAuthTokens(data.accessToken, data.refreshToken);
        setUser(data.user);
        setPermissions(data.permissions || []);
      } finally {
        setIsLoading(false);
      }
    },
    [setAuthTokens]
  );

  // Check if user has one of the allowed roles
  const hasRole = useCallback(
    (roleOrRoles: RoleCode | RoleCode[] | string | string[]): boolean => {
      if (!user || !user.role) return false;
      const userRole = user.role.code;

      // Super Admin has all roles
      if (userRole === 'super_admin') return true;

      const rolesArray = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
      return rolesArray.includes(userRole);
    },
    [user]
  );

  // Check if user has a specific permission string
  const hasPermission = useCallback(
    (permissionCode: string): boolean => {
      if (!user || !user.role) return false;
      if (user.role.code === 'super_admin') return true;
      if (permissions.includes('*')) return true;
      return permissions.includes(permissionCode);
    },
    [user, permissions]
  );

  // Convenient capability check: can('entity', 'create')
  const can = useCallback(
    (resource: string, action: string): boolean => {
      return hasPermission(`${resource}:${action}`);
    },
    [hasPermission]
  );

  const contextValue = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!user && !!token,
      isLoading,
      permissions,
      login,
      logout,
      hasRole,
      hasPermission,
      can,
    }),
    [user, token, isLoading, permissions, login, logout, hasRole, hasPermission, can]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
