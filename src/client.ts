// Framework-agnostic auth engine. All the SSO state-machine logic lives here; the React and Angular
// adapters only mirror `state` into their reactivity primitives.
//
// Scope (post-Keycloak): CrimsonRaven (Keycloak) hosts the login, registration, email-verification,
// resend and forgot-password pages itself — so this engine only does the OIDC redirect/callback,
// token storage + silent renew, and the optional legacy (break-glass) password login. The old
// unverified-email "hold" + "resend" machinery is gone (Keycloak owns verification).
import { getUserManager, loadRuntimeConfig } from './config.js';

export interface AuthUser {
  id: string;
  email: string;
}

/** The reactive snapshot the adapters expose. */
export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  /** CrimsonRaven is configured AND reachable now → login goes straight to it (no choice). */
  ssoOnline: boolean;
  /** CrimsonRaven is configured for this stack (regardless of reachability). */
  ssoConfigured: boolean;
  /** Runtime config resolved — gates the login screen so it doesn't flash the legacy form. */
  ready: boolean;
  /** 'crimsonraven' (default) → CR only; 'legacy' → the app's password form only (env break-glass). */
  authMode: 'crimsonraven' | 'legacy';
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AuthClientOptions {}

/** Pull the API's `{ error }` message out of a failed response, falling back to a default. */
async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return typeof data?.error === 'string' && data.error ? data.error : fallback;
  } catch {
    return fallback;
  }
}

export class AuthClient {
  private listeners = new Set<(s: AuthState) => void>();
  private _state: AuthState;
  private initialized = false;

  constructor(_options: AuthClientOptions = {}) {
    const storedUser = localStorage.getItem('user');
    this._state = {
      user: storedUser ? JSON.parse(storedUser) : null,
      token: localStorage.getItem('token'),
      ssoOnline: false,
      ssoConfigured: false,
      ready: false,
      authMode: 'crimsonraven',
    };
  }

  get state(): AuthState {
    return this._state;
  }

  /** Subscribe to state changes; returns an unsubscribe. */
  subscribe(fn: (s: AuthState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(patch: Partial<AuthState>): void {
    this._state = { ...this._state, ...patch };
    for (const l of this.listeners) l(this._state);
  }

  /**
   * Resolve runtime config and wire token renewal. CrimsonRaven is the front door when reachable
   * (ssoOnline). Idempotent — safe under React StrictMode's double-invoke.
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    const cfg = await loadRuntimeConfig();
    this.set({
      ssoConfigured: !!cfg.oidcEnabled,
      ssoOnline: !!(cfg.oidcEnabled && cfg.oidcOnline),
      ready: true,
      authMode: cfg.authMode === 'legacy' ? 'legacy' : 'crimsonraven',
    });
    if (!cfg.oidcEnabled) return;
    const mgr = await getUserManager();
    mgr?.events.addUserLoaded((u) => {
      localStorage.setItem('token', u.access_token);
      this.set({ token: u.access_token });
    });
  }

  private setSession(token: string, user: AuthUser): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.set({ user, token });
  }

  login = async (email: string, password: string): Promise<void> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'Invalid email or password'));
    const data = await res.json();
    this.setSession(data.token, { id: data.userId, email: data.email });
  };

  register = async (email: string, password: string): Promise<void> => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'Registration failed'));
    const data = await res.json();
    this.setSession(data.token, { id: data.userId, email: data.email });
  };

  loginWithSSO = async (): Promise<void> => {
    const mgr = await getUserManager();
    if (!mgr) throw new Error('SSO is not configured.');
    await mgr.signinRedirect();
  };

  /**
   * Completes the PKCE code exchange, then asks the backend who we are: the OIDC token's `sub` is the
   * IdP subject, but the backend maps it to (and returns) our internal User.Id. Keycloak has already
   * gated email verification before issuing the token, so there's no app-side hold to handle.
   */
  completeSsoCallback = async (): Promise<void> => {
    const mgr = await getUserManager();
    if (!mgr) throw new Error('SSO is not configured.');
    const oidcUser = await mgr.signinRedirectCallback();
    const accessToken = oidcUser.access_token;
    localStorage.setItem('token', accessToken); // so requests attach it on /me
    this.set({ token: accessToken });
    const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      localStorage.removeItem('token');
      this.set({ token: null });
      throw new Error(await errorMessage(res, 'Could not establish your session.'));
    }
    const data = await res.json();
    this.setSession(accessToken, { id: data.userId, email: data.email });
  };

  logout = async (): Promise<void> => {
    const mgr = await getUserManager();
    const oidcUser = mgr ? await mgr.getUser().catch(() => null) : null;
    // Clear the persisted session first so any return from the IdP — or a local logout — lands
    // logged-out (a fresh client seeds user/token from these on construction).
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (mgr && oidcUser) {
      // End the CrimsonRaven session and leave the page. Do NOT clear in-app state first: that
      // remounts the login screen, whose Raven-first effect fires signinRedirect and races (and
      // usually beats) this signout — so the IdP cookie survives and you're silently re-authed.
      try {
        await mgr.signoutRedirect();
        return; // page is now navigating to the IdP end-session endpoint
      } catch {
        await mgr.removeUser().catch(() => {});
      }
    }
    // Local (non-SSO) logout, or signout failed to start: clear in-app state.
    this.set({ user: null, token: null });
  };
}
