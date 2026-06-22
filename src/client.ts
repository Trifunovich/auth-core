// Framework-agnostic auth engine. All the SSO state-machine logic lives here; the React and Angular
// adapters only mirror `state` into their reactivity primitives. Ported verbatim from the apps'
// AuthContext.tsx so every consumer behaves identically.
import { getUserManager, loadRuntimeConfig } from './config.js';

/** Set when an SSO sign-in is held by the backend (unverified email matching an existing account).
 *  Its presence tells the login screen to stop auto-redirecting to the IdP and offer a way out
 *  instead; the value is the human message to show. Cleared on any successful session/logout. */
export const SSO_BLOCKED_KEY = 'sso_blocked';

/** Holds the still-valid IdP token of a held sign-in, so the "resend verification email" action can
 *  POST it to our backend, which sends a fresh code via CrimsonRaven (SendEmailCode, app-mailer PAT). */
export const SSO_PENDING_KEY = 'sso_pending';

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

  private persist(token: string, user: AuthUser): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  private setSession(token: string, user: AuthUser): void {
    localStorage.removeItem(SSO_BLOCKED_KEY); // a real session clears any prior "verify email" hold
    localStorage.removeItem(SSO_PENDING_KEY);
    this.persist(token, user);
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
   * Completes the code exchange, then asks the backend who we are: the OIDC token's `sub` is the IdP
   * subject, but the backend maps it to (and returns) our internal User.Id. On an unverified-email
   * HOLD the backend 403s; we must NOT fall back into the SSO redirect (the IdP session is live, so it
   * would silently re-auth and 403 forever). Flag it so the login screen shows a way out instead.
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
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}) as { error?: string; message?: string });
        if (data?.error === 'email_unverified') {
          localStorage.removeItem('token');
          this.set({ token: null });
          // Keep the (still-valid) token + subject so the held screen can resend the verification
          // email via our backend. sub = the IdP subject (Zitadel userId).
          localStorage.setItem(
            SSO_PENDING_KEY,
            JSON.stringify({ token: accessToken, sub: oidcUser.profile.sub }),
          );
          localStorage.setItem(
            SSO_BLOCKED_KEY,
            data.message || 'Please verify your email, then sign in again.',
          );
          throw new Error('email_unverified');
        }
      }
      throw new Error(await errorMessage(res, 'Could not establish your session.'));
    }
    const data = await res.json();
    this.setSession(accessToken, { id: data.userId, email: data.email });
  };

  /** Resend the email-verification mail for a held sign-in. Our backend proxies to CrimsonRaven with a
   *  machine PAT — the user's own JWT can't call CR's API directly (instance audience bug). */
  resendVerification = async (): Promise<void> => {
    const raw = localStorage.getItem(SSO_PENDING_KEY);
    if (!raw) throw new Error('Your session expired — sign in again to resend.');
    const { token: heldToken } = JSON.parse(raw) as { token: string };
    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { Authorization: `Bearer ${heldToken}` },
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'Could not send the verification email.'));
  };

  logout = async (): Promise<void> => {
    const mgr = await getUserManager();
    const oidcUser = mgr ? await mgr.getUser().catch(() => null) : null;
    // Clear the persisted session first so any return from the IdP — or a local logout — lands
    // logged-out (a fresh client seeds user/token from these on construction).
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(SSO_BLOCKED_KEY);
    localStorage.removeItem(SSO_PENDING_KEY);
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
