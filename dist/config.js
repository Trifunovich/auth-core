// OIDC (PKCE) client for CrimsonRaven SSO, framework-agnostic. The authority + client id are NOT
// baked at build time — one Docker image is promoted across stacks pointing at different CrimsonRaven
// instances (homelab http vs prod https). So we fetch them at runtime from the backend's /api/config
// and lazily build a single UserManager. When OIDC isn't configured for the stack, getUserManager()
// resolves to null and the SSO UI stays hidden.
//
// Ported verbatim from the apps' src/lib/oidc.ts so every consumer shares one engine.
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
let cachedConfig = null;
let inflight = null;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * Load the SPA's runtime config (OIDC authority + live reachability) from the backend.
 *
 * This gates whether a user is sent to CrimsonRaven or dropped onto the legacy break-glass
 * form, so it must be resilient: a single flaky request on a poor mobile link must NOT strand
 * a CR-only account on a password form it can't use. So we
 *   - retry a few times with backoff before giving up;
 *   - cache only a *successful* answer — a failure is never memoised, so the next call
 *     (a reload, an AuthContext re-check, regained connectivity) tries again from scratch;
 *   - never throw — on total failure we resolve to a transient, UN-cached `oidcEnabled:false`.
 */
export function loadRuntimeConfig() {
    if (cachedConfig)
        return Promise.resolve(cachedConfig);
    inflight ?? (inflight = (async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const r = await fetch('/api/config', { cache: 'no-store' });
                if (!r.ok)
                    throw new Error(`/api/config responded ${r.status}`);
                cachedConfig = (await r.json());
                return cachedConfig;
            }
            catch {
                if (attempt < 2)
                    await delay(300 * 2 ** attempt); // 300ms, then 600ms
            }
        }
        return { oidcEnabled: false }; // transient — deliberately not cached
    })().finally(() => {
        inflight = null;
    }));
    return inflight;
}
/** Drop any cached config and re-load it — used to re-check CrimsonRaven after the network
 *  recovers (the cached value may be a stale "offline"/"disabled" from a flaky moment). */
export function refreshRuntimeConfig() {
    cachedConfig = null;
    return loadRuntimeConfig();
}
let manager = null;
export async function getUserManager() {
    const cfg = await loadRuntimeConfig();
    if (!cfg.oidcEnabled || !cfg.oidcAuthority || !cfg.oidcClientId)
        return null;
    manager ?? (manager = new UserManager({
        authority: cfg.oidcAuthority,
        client_id: cfg.oidcClientId,
        redirect_uri: `${window.location.origin}/auth/callback`,
        post_logout_redirect_uri: window.location.origin,
        response_type: 'code',
        scope: 'openid profile email offline_access',
        // Keep the session out of the URL and renew silently using the refresh token.
        userStore: new WebStorageStateStore({ store: window.localStorage }),
        automaticSilentRenew: true,
    }));
    return manager;
}
//# sourceMappingURL=config.js.map