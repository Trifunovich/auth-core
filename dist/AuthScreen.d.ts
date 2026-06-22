import { type ReactNode } from 'react';
export interface AuthScreenProps {
    /**
     * App-specific legacy email/password form, shown only in legacy (maintenance) mode. If omitted, a
     * minimal built-in sign-in form is used as the break-glass default.
     */
    legacy?: ReactNode;
}
export declare function AuthScreen({ legacy }: AuthScreenProps): import("react").JSX.Element;
//# sourceMappingURL=AuthScreen.d.ts.map