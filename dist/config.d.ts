import { UserManager } from 'oidc-client-ts';
export interface RuntimeConfig {
    oidcEnabled: boolean;
    oidcOnline?: boolean;
    oidcAuthority?: string;
    oidcClientId?: string;
    oidcLogoUrl?: string;
    oidcLogoUrlDark?: string;
    /** Login mode. 'crimsonraven' (default) → CR only. 'legacy' → the app's email/password form only
     *  (a manual break-glass for CR maintenance, env-driven on the backend). Never both at once. */
    authMode?: 'crimsonraven' | 'legacy';
}
export declare function loadRuntimeConfig(): Promise<RuntimeConfig>;
export declare function getUserManager(): Promise<UserManager | null>;
//# sourceMappingURL=config.d.ts.map