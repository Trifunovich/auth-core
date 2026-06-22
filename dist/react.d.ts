import { type ReactNode } from 'react';
import { type AuthUser } from './client.js';
export interface AuthContextValue {
    user: AuthUser | null;
    token: string | null;
    /** CrimsonRaven is configured AND reachable now → login goes straight to it (no choice). */
    ssoOnline: boolean;
    /** CrimsonRaven is configured for this stack (regardless of reachability). */
    ssoConfigured: boolean;
    /** Runtime config resolved — gates the login screen so it doesn't flash the legacy form. */
    authReady: boolean;
    /** Login mode: 'crimsonraven' (CR only) or 'legacy' (the app's password form only, env break-glass). */
    authMode: 'crimsonraven' | 'legacy';
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    loginWithSSO: () => Promise<void>;
    completeSsoCallback: () => Promise<void>;
    logout: () => Promise<void>;
}
export declare function AuthProvider({ children }: {
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useAuth(): AuthContextValue;
export { AuthScreen } from './AuthScreen.js';
export type { AuthScreenProps } from './AuthScreen.js';
//# sourceMappingURL=react.d.ts.map