import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { NetworkError, request, setUnauthorizedHandler } from '@/lib/api-client';
import * as tokenStorage from '@/lib/token-storage';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  signIn: (email: string, password: string) => Promise<void>;
  /** revoked=false means the server could not be reached, so its copy of the token may still be valid. */
  signOut: () => Promise<{ revoked: boolean }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type LoginResponse = { data: { token: string } };

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');

  const dropSession = useCallback(async () => {
    await tokenStorage.clearToken();
    queryClient.clear();
    setStatus('signedOut');
  }, [queryClient]);

  useEffect(() => {
    let active = true;

    tokenStorage.getToken().then((token) => {
      if (active) {
        setStatus(token ? 'signedIn' : 'signedOut');
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // An expired or revoked token (401) ends the session; the owner signs in again.
    setUnauthorizedHandler(() => void dropSession());

    return () => setUnauthorizedHandler(undefined);
  }, [dropSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password, device_name: 'Android' },
      auth: false,
    });

    await tokenStorage.saveToken(response.data.token);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    let revoked = true;

    try {
      await request('/auth/logout', { method: 'POST' });
    } catch (error) {
      // Offline: we cannot claim the server token was revoked, but local access is cleared regardless.
      revoked = !(error instanceof NetworkError);
    }

    await dropSession();

    return { revoked };
  }, [dropSession]);

  const value = useMemo(() => ({ status, signIn, signOut }), [status, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
