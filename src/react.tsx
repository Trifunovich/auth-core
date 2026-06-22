// React adapter: a thin Context/hook over AuthClient. The provider owns one AuthClient instance and
// mirrors its `state` into React state via subscribe(); all logic stays in the engine. Drop-in for the
// apps' old src/context/AuthContext.tsx — same `useAuth()` shape, same SSO_BLOCKED_KEY export.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AuthClient, SSO_BLOCKED_KEY, type AuthState, type AuthUser } from './client';

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  /** CrimsonRaven is configured AND reachable now → login goes straight to it (no choice). */
  ssoOnline: boolean;
  /** CrimsonRaven is configured for this stack (regardless of reachability). */
  ssoConfigured: boolean;
  /** Runtime config resolved — gates the login screen so it doesn't flash the legacy form. */
  authReady: boolean;
  /** Login mode: 'crimsonraven' (CR only) or 'legacy' (the app's password form only, env break-glass). */
  authMode: 'crimsonraven' | 'legacy';
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithSSO: () => Promise<void>;
  completeSsoCallback: () => Promise<void>;
  resendVerification: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const ref = useRef<AuthClient | null>(null);
  if (!ref.current) ref.current = new AuthClient();
  const client = ref.current;

  const [state, setState] = useState<AuthState>(client.state);
  useEffect(() => {
    const unsubscribe = client.subscribe(setState);
    void client.init();
    return unsubscribe;
  }, [client]);

  const value: AuthContextValue = {
    user: state.user,
    token: state.token,
    ssoOnline: state.ssoOnline,
    ssoConfigured: state.ssoConfigured,
    authReady: state.ready,
    authMode: state.authMode,
    // Methods are bound arrow-props on the client, so these references are stable across renders.
    login: client.login,
    register: client.register,
    loginWithSSO: client.loginWithSSO,
    completeSsoCallback: client.completeSsoCallback,
    resendVerification: client.resendVerification,
    logout: client.logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { SSO_BLOCKED_KEY };

// The standardized screen lives in its own module; re-export here so consumers get it from
// `@bearsoft/auth-core/react`. (Declared after AuthProvider/useAuth so the cycle resolves cleanly.)
export { AuthScreen } from './AuthScreen';
export type { AuthScreenProps, AuthScreenCopy } from './AuthScreen';
