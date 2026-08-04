import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Standardized auth screen. In CrimsonRaven mode it renders the shared SsoCard (identical across every
// app; Keycloak hosts the real login/registration/verify/forgot pages). In legacy (break-glass) mode
// it renders the app's own password form inside the same card shell. Theme via '@bearsoft/auth-core/auth.css'.
import { useState } from 'react';
import { useAuth } from './react.js';
import { SsoCard } from './SsoCard.js';
export function AuthScreen({ brand, legacy }) {
    const { ssoConfigured, authMode, authReady } = useAuth();
    const legacyMode = authMode === 'legacy' || !ssoConfigured;
    if (!authReady) {
        return (_jsx("div", { className: "bsa-screen", children: _jsx("div", { className: "bsa-card", children: _jsx("p", { className: "bsa-sub", children: "Loading\u2026" }) }) }));
    }
    if (legacyMode) {
        return (_jsx("div", { className: "bsa-screen", children: _jsxs("div", { className: "bsa-card", children: [_jsx("h1", { className: "bsa-brand", children: brand }), legacy ?? _jsx(BasicSignIn, {})] }) }));
    }
    return _jsx(SsoCard, { brand: brand });
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
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("form", { onSubmit: submit, className: "bsa-form", children: [_jsx("h2", { children: "Sign in" }), _jsxs("div", { className: "bsa-field", children: [_jsx("label", { htmlFor: "bsa-email", children: "Email" }), _jsx("input", { id: "bsa-email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true })] }), _jsxs("div", { className: "bsa-field", children: [_jsx("label", { htmlFor: "bsa-pass", children: "Password" }), _jsx("input", { id: "bsa-pass", type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true })] }), error && _jsx("div", { className: "bsa-error", children: error }), _jsx("button", { className: "bsa-btn", type: "submit", disabled: busy, children: busy ? 'Signing in…' : 'Sign in' })] }));
}
//# sourceMappingURL=AuthScreen.js.map