import { UserManager } from 'oidc-client-ts';
export interface RuntimeConfig {
    oidcEnabled: boolean;
    oidcOnline?: boolean;
    oidcAuthority?: string;
    oidcClientId?: string;
    oidcLogoUrl?: string;
    oidcLogoUrlDark?: string;
}
export declare function loadRuntimeConfig(): Promise<RuntimeConfig>;
export declare function getUserManager(): Promise<UserManager | null>;
//# sourceMappingURL=config.d.ts.map