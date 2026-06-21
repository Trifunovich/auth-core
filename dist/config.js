// OIDC (PKCE) client for CrimsonRaven SSO, framework-agnostic. The authority + client id are NOT
// baked at build time — one Docker image is promoted across stacks pointing at different CrimsonRaven
// instances (homelab http vs prod https). So we fetch them at runtime from the backend's /api/config
// and lazily build a single UserManager. When OIDC isn't configured for the stack, getUserManager()
// resolves to null and the SSO UI stays hidden.
//
// Ported verbatim from the apps' src/lib/oidc.ts so every consumer shares one engine.
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
let configPromise = null;
export function loadRuntimeConfig() {
    configPromise ?? (configPromise = fetch('/api/config')
        .then((r) => (r.ok ? r.json() : { oidcEnabled: false }))
        .catch(() => ({ oidcEnabled: false })));
    return configPromise;
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