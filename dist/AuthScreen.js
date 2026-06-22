import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// Minimal auth screen. In CrimsonRaven mode it just bounces to Keycloak (which hosts the themed
// login / registration / verify-email / forgot-password pages) and shows a "Signing you in…" spinner;
// on failure it offers a retry plus a clean "log out and start over". In legacy (break-glass) mode it
// renders the app's own password form. Theme the small spinner/card via '@bearsoft/auth-core/auth.css'.
import { useEffect, useState } from 'react';
import { useAuth } from './react.js';
function message(e) {
    return e instanceof Error ? e.message : 'Something went wrong.';
}
export function AuthScreen({ legacy }) {
    const { ssoConfigured, authMode, authReady, loginWithSSO, logout } = useAuth();
    const [error, setError] = useState('');
    const legacyMode = authMode === 'legacy' || !ssoConfigured;
    const startSso = () => {
        setError('');
        loginWithSSO().catch((e) => setError(message(e)));
    };
    // CR mode: bounce straight to CrimsonRaven (Keycloak) — no manual "Sign in" gate. Keycloak owns the
    // login UI, so the app screen is only ever a transient spinner (or the failure fallback below).
    useEffect(() => {
        if (!authReady || legacyMode)
            return;
        loginWithSSO().catch((e) => setError(message(e)));
    }, [authReady, legacyMode, loginWithSSO]);
    function body() {
        if (!authReady)
            return _jsx("p", { className: "bsa-sub", children: "Loading\u2026" });
        if (legacyMode)
            return legacy ?? _jsx(BasicSignIn, {});
        if (error) {
            return (_jsxs(_Fragment, { children: [_jsx("div", { className: "bsa-error", children: error }), _jsx("button", { className: "bsa-btn", onClick: startSso, children: "Try again" }), _jsx("button", { className: "bsa-link", onClick: () => void logout(), children: "Log out and start over" })] }));
        }
        return _jsx("p", { className: "bsa-sub", children: "Signing you in\u2026" });
    }
    return (_jsx("div", { className: "bsa-screen", children: _jsx("div", { className: "bsa-card", children: body() }) }));
}
/** Minimal built-in legacy sign-in (email + password). Apps with register/forgot pass their own via
 *  the `legacy` slot; this is the break-glass default for maintenance mode. */
function BasicSignIn() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            await login(email, password);
        }
        catch (err) {
            setError(message(err));
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("form", { onSubmit: submit, className: "bsa-form", children: [_jsx("h2", { children: "Sign in" }), _jsxs("div", { className: "bsa-field", children: [_jsx("label", { htmlFor: "bsa-email", children: "Email" }), _jsx("input", { id: "bsa-email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true })] }), _jsxs("div", { className: "bsa-field", children: [_jsx("label", { htmlFor: "bsa-pass", children: "Password" }), _jsx("input", { id: "bsa-pass", type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true })] }), error && _jsx("div", { className: "bsa-error", children: error }), _jsx("button", { className: "bsa-btn", type: "submit", disabled: busy, children: busy ? 'Signing in…' : 'Sign in' })] }));
}
//# sourceMappingURL=AuthScreen.js.map