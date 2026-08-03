import { jsx as _jsx } from "react/jsx-runtime";
// React adapter: a thin Context/hook over AuthClient. The provider owns one AuthClient instance and
// mirrors its `state` into React state via subscribe(); all logic stays in the engine. Drop-in for the
// apps' old src/context/AuthContext.tsx — same `useAuth()` shape, same SSO_BLOCKED_KEY export.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AuthClient } from './client.js';
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
        // Re-check SSO availability when the network recovers or the tab regains focus: a user who
        // loaded during a flaky moment may have a transient "offline"/"disabled" config that would
        // otherwise strand them on the legacy form. refreshRuntimeConfig (inside recheckConfig)
        // bypasses the cache; a successful re-read replaces it.
        const recheck = () => {
            if (client.state.token)
                return; // already signed in — no need to re-probe SSO availability
            void client.recheckConfig();
        };
        const onVisible = () => {
            if (document.visibilityState === 'visible')
                recheck();
        };
        window.addEventListener('online', recheck);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            unsubscribe();
            window.removeEventListener('online', recheck);
            document.removeEventListener('visibilitychange', onVisible);
        };
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
// The standardized screen lives in its own module; re-export here so consumers get it from
// `@bearsoft/auth-core/react`. (Declared after AuthProvider/useAuth so the cycle resolves cleanly.)
export { AuthScreen } from './AuthScreen.js';
//# sourceMappingURL=react.js.map