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
export interface AuthClientOptions {
}
export declare class AuthClient {
    private listeners;
    private _state;
    private initialized;
    constructor(_options?: AuthClientOptions);
    get state(): AuthState;
    /** Subscribe to state changes; returns an unsubscribe. */
    subscribe(fn: (s: AuthState) => void): () => void;
    private set;
    /**
     * Resolve runtime config and wire token renewal. CrimsonRaven is the front door when reachable
     * (ssoOnline). Idempotent — safe under React StrictMode's double-invoke.
     */
    init(): Promise<void>;
    private setSession;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    loginWithSSO: () => Promise<void>;
    /**
     * Completes the PKCE code exchange, then asks the backend who we are: the OIDC token's `sub` is the
     * IdP subject, but the backend maps it to (and returns) our internal User.Id. Keycloak has already
     * gated email verification before issuing the token, so there's no app-side hold to handle.
     */
    completeSsoCallback: () => Promise<void>;
    logout: () => Promise<void>;
}
//# sourceMappingURL=client.d.ts.map