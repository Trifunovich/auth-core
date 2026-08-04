// Framework-agnostic auth engine. All the SSO state-machine logic lives here; the React and Angular
// adapters only mirror `state` into their reactivity primitives.
//
// Scope (post-Keycloak): CrimsonRaven (Keycloak) hosts the login, registration, email-verification,
// resend and forgot-password pages itself — so this engine only does the OIDC redirect/callback,
// token storage + silent renew, and the optional legacy (break-glass) password login. The old
// unverified-email "hold" + "resend" machinery is gone (Keycloak owns verification).
import { getUserManager, loadRuntimeConfig, refreshRuntimeConfig } from './config.js';
/** Per-tab guard so the silent (prompt=none) SSO probe runs at most once — a `login_required` return
 *  must not bounce back to CrimsonRaven again (that would be the very loop we're removing). */
const SILENT_TRIED_KEY = 'cr_silent_tried';
/** Pull the API's `{ error }` message out of a failed response, falling back to a default. */
async function errorMessage(res, fallback) {
    try {
        const data = await res.json();
        return typeof data?.error === 'string' && data.error ? data.error : fallback;
    }
    catch {
        return fallback;
    }
}
export class AuthClient {
    constructor(_options = {}) {
        this.listeners = new Set();
        this.initialized = false;
        /**
         * Re-fetch runtime config (bypassing the cache) and re-apply SSO availability. Adapters call this
         * when the network recovers or the tab regains focus, so a user who loaded during a flaky moment
         * (a transient `oidcEnabled:false`) isn't stranded on the legacy password form once CrimsonRaven
         * is reachable again.
         */
        this.recheckConfig = async () => {
            this.applyConfig(await refreshRuntimeConfig());
        };
        this.login = async (email, password) => {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (!res.ok)
                throw new Error(await errorMessage(res, 'Invalid email or password'));
            const data = await res.json();
            this.setSession(data.token, { id: data.userId, email: data.email });
        };
        this.register = async (email, password) => {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (!res.ok)
                throw new Error(await errorMessage(res, 'Registration failed'));
            const data = await res.json();
            this.setSession(data.token, { id: data.userId, email: data.email });
        };
        this.loginWithSSO = async () => {
            const mgr = await getUserManager();
            if (!mgr)
                throw new Error('SSO is not configured.');
            await mgr.signinRedirect();
        };
        /**
         * Completes the PKCE code exchange, then asks the backend who we are: the OIDC token's `sub` is the
         * IdP subject, but the backend maps it to (and returns) our internal User.Id. Keycloak has already
         * gated email verification before issuing the token, so there's no app-side hold to handle.
         */
        this.completeSsoCallback = async () => {
            const mgr = await getUserManager();
            if (!mgr)
                throw new Error('SSO is not configured.');
            let oidcUser;
            try {
                oidcUser = await mgr.signinRedirectCallback();
            }
            catch (e) {
                // A prompt=none probe against a signed-out CrimsonRaven comes back here as login_required
                // (or interaction/consent_required). That's the expected "no session" answer, not a failure:
                // show the Sign-in button rather than an error, and don't re-probe.
                const err = e?.error;
                if (err === 'login_required' || err === 'interaction_required' || err === 'consent_required') {
                    sessionStorage.setItem(SILENT_TRIED_KEY, '1');
                    this.set({ needsInteractiveLogin: true });
                    return;
                }
                throw e;
            }
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
            const name = oidcUser.profile.given_name ||
                oidcUser.profile.name ||
                undefined;
            this.setSession(accessToken, { id: data.userId, email: data.email, name });
        };
        this.logout = async () => {
            const mgr = await getUserManager();
            const oidcUser = mgr ? await mgr.getUser().catch(() => null) : null;
            // Clear the persisted session first so any return from the IdP — or a local logout — lands
            // logged-out (a fresh client seeds user/token from these on construction).
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem(SILENT_TRIED_KEY); // let the next load silently re-probe CrimsonRaven
            if (mgr && oidcUser) {
                // End the CrimsonRaven session and leave the page. Do NOT clear in-app state first: that
                // remounts the login screen, whose Raven-first effect fires signinRedirect and races (and
                // usually beats) this signout — so the IdP cookie survives and you're silently re-authed.
                try {
                    await mgr.signoutRedirect();
                    return; // page is now navigating to the IdP end-session endpoint
                }
                catch {
                    await mgr.removeUser().catch(() => { });
                }
            }
            // Local (non-SSO) logout, or signout failed to start: clear in-app state.
            this.set({ user: null, token: null });
        };
        const storedUser = localStorage.getItem('user');
        this._state = {
            user: storedUser ? JSON.parse(storedUser) : null,
            token: localStorage.getItem('token'),
            ssoOnline: false,
            ssoConfigured: false,
            ready: false,
            authMode: 'crimsonraven',
            needsInteractiveLogin: false,
        };
    }
    get state() {
        return this._state;
    }
    /** Subscribe to state changes; returns an unsubscribe. */
    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }
    set(patch) {
        this._state = { ...this._state, ...patch };
        for (const l of this.listeners)
            l(this._state);
    }
    /**
     * Resolve runtime config and wire token renewal. CrimsonRaven is the front door when reachable
     * (ssoOnline). Idempotent — safe under React StrictMode's double-invoke.
     */
    async init() {
        if (this.initialized)
            return;
        this.initialized = true;
        const cfg = await loadRuntimeConfig();
        this.applyConfig(cfg);
        if (!cfg.oidcEnabled)
            return;
        const mgr = await getUserManager();
        if (!mgr)
            return;
        mgr.events.addUserLoaded((u) => {
            localStorage.setItem('token', u.access_token);
            this.set({ token: u.access_token });
        });
        // The /auth/callback route owns the code (or login_required) exchange — don't probe here.
        if (window.location.pathname === '/auth/callback')
            return;
        // Already have a local OIDC session? Renew it via the refresh token (offline_access). This is a
        // plain token-endpoint XHR — no iframe, no third-party cookie — so a page refresh keeps you
        // signed in even under Firefox's cookie partitioning.
        const stored = await mgr.getUser().catch(() => null);
        if (stored?.refresh_token) {
            try {
                const u = await mgr.signinSilent();
                if (u) {
                    localStorage.setItem('token', u.access_token);
                    this.set({ token: u.access_token });
                }
            }
            catch (e) {
                // A permanently-dead refresh token (invalid_grant) means the persisted session is a zombie:
                // a signed-in shell holding a bearer the API will 401. Clear it so the UI shows logged-out
                // now. Any other error (offline, IdP briefly unreachable) is transient — keep the session.
                if (e?.error === 'invalid_grant') {
                    void mgr.removeUser();
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    this.set({ user: null, token: null, needsInteractiveLogin: true });
                }
            }
            return;
        }
        // No local session: attempt cross-app SSO SILENTLY via a top-level prompt=none redirect, ONCE
        // per tab. If CrimsonRaven has a session (you signed into another app) this comes straight back
        // with a code and logs you in — with no password and, crucially, without ever parking on
        // Keycloak's interactive login form. That parked form is what looped "restart login cookie not
        // found" across tabs. No session → Keycloak returns login_required and we show the Sign-in button.
        if (this._state.ssoConfigured && !sessionStorage.getItem(SILENT_TRIED_KEY)) {
            sessionStorage.setItem(SILENT_TRIED_KEY, '1');
            try {
                await mgr.signinRedirect({ prompt: 'none' });
                return; // navigating to CrimsonRaven now
            }
            catch {
                // couldn't even start the redirect (SSO offline/misconfigured) — fall through to the button
            }
        }
        this.set({ needsInteractiveLogin: this._state.ssoConfigured });
    }
    /** Mirror resolved runtime config into SSO-availability state (shared by init + recheckConfig). */
    applyConfig(cfg) {
        this.set({
            ssoConfigured: !!cfg.oidcEnabled,
            ssoOnline: !!(cfg.oidcEnabled && cfg.oidcOnline),
            ready: true,
            authMode: cfg.authMode === 'legacy' ? 'legacy' : 'crimsonraven',
        });
    }
    setSession(token, user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        this.set({ user, token, needsInteractiveLogin: false });
    }
}
//# sourceMappingURL=client.js.map