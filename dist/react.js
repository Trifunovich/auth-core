import { jsx as _jsx } from "react/jsx-runtime";
// React adapter: a thin Context/hook over AuthClient. The provider owns one AuthClient instance and
// mirrors its `state` into React state via subscribe(); all logic stays in the engine. Drop-in for the
// apps' old src/context/AuthContext.tsx — same `useAuth()` shape, same SSO_BLOCKED_KEY export.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AuthClient, SSO_BLOCKED_KEY } from './client';
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const ref = useRef(null);
    if (!ref.current)
        ref.current = new AuthClient();
    const client = ref.current;
    const [state, setState] = useState(client.state);
    useEffect(() => {
        const unsubscribe = client.subscribe(setState);
        void client.init();
        return unsubscribe;
    }, [client]);
    const value = {
        user: state.user,
        token: state.token,
        ssoOnline: state.ssoOnline,
        ssoConfigured: state.ssoConfigured,
        authReady: state.ready,
        authMode: state.authMode,
        // Methods are bound arrow-props on the client, so these references are stable across renders.
        login: client.login,
        register: client.register,
        loginWithSSO: client.loginWithSSO,
        completeSsoCallback: client.completeSsoCallback,
        resendVerification: client.resendVerification,
        logout: client.logout,
    };
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
export { SSO_BLOCKED_KEY };
// The standardized screen lives in its own module; re-export here so consumers get it from
// `@bearsoft/auth-core/react`. (Declared after AuthProvider/useAuth so the cycle resolves cleanly.)
export { AuthScreen } from './AuthScreen';
//# sourceMappingURL=react.js.map