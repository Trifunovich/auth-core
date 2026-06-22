import { type ReactNode } from 'react';
export interface AuthScreenCopy {
    /** Brand-panel title, e.g. "Rosella Rhythm". */
    appName: string;
    /** Brand-panel subtitle, e.g. "Track and predict your cycle". */
    tagline?: string;
    /** App logo URL for the brand panel. */
    logoUrl?: string;
}
export interface AuthScreenProps {
    copy: AuthScreenCopy;
    /**
     * App-specific legacy email/password form, shown in legacy (maintenance) mode or when a held user
     * picks "sign in with a password instead". If omitted, a minimal built-in sign-in form is used.
     */
    legacy?: ReactNode;
}
export declare function AuthScreen({ copy, legacy }: AuthScreenProps): import("react").JSX.Element;
//# sourceMappingURL=AuthScreen.d.ts.map