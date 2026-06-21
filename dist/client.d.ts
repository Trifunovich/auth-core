/** Set when an SSO sign-in is held by the backend (unverified email matching an existing account).
 *  Its presence tells the login screen to stop auto-redirecting to the IdP and offer a way out
 *  instead; the value is the human message to show. Cleared on any successful session/logout. */
export declare const SSO_BLOCKED_KEY = "sso_blocked";
/** Holds the still-valid IdP token of a held sign-in, so the "resend verification email" action can
 *  POST it to our backend, which sends a fresh code via CrimsonRaven (SendEmailCode, app-mailer PAT). */
export declare const SSO_PENDING_KEY = "sso_pending";
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
    private persist;
    private setSession;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    loginWithSSO: () => Promise<void>;
    /**
     * Completes the code exchange, then asks the backend who we are: the OIDC token's `sub` is the IdP
     * subject, but the backend maps it to (and returns) our internal User.Id. On an unverified-email
     * HOLD the backend 403s; we must NOT fall back into the SSO redirect (the IdP session is live, so it
     * would silently re-auth and 403 forever). Flag it so the login screen shows a way out instead.
     */
    completeSsoCallback: () => Promise<void>;
    /** Resend the email-verification mail for a held sign-in. Our backend proxies to CrimsonRaven with a
     *  machine PAT — the user's own JWT can't call CR's API directly (instance audience bug). */
    resendVerification: () => Promise<void>;
    logout: () => Promise<void>;
}
//# sourceMappingURL=client.d.ts.map