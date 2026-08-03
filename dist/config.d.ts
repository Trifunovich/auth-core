import { UserManager } from 'oidc-client-ts';
export interface RuntimeConfig {
    oidcEnabled: boolean;
    oidcOnline?: boolean;
    oidcAuthority?: string;
    oidcClientId?: string;
    /** Login mode. 'crimsonraven' (default) → CR only. 'legacy' → the app's email/password form only
     *  (a manual break-glass for CR maintenance, env-driven on the backend). Never both at once. */
    authMode?: 'crimsonraven' | 'legacy';
}
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
export declare function loadRuntimeConfig(): Promise<RuntimeConfig>;
/** Drop any cached config and re-load it — used to re-check CrimsonRaven after the network
 *  recovers (the cached value may be a stale "offline"/"disabled" from a flaky moment). */
export declare function refreshRuntimeConfig(): Promise<RuntimeConfig>;
export declare function getUserManager(): Promise<UserManager | null>;
//# sourceMappingURL=config.d.ts.map