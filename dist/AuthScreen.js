import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Standardized Split-panel auth screen. In CR mode it's a brand panel + a "Sign in" button + the
// unverified-email "verify your email" card. The legacy email/password form is maintenance-only, so the
// app injects its own (the `legacy` slot) — or gets a minimal built-in. Theme via CSS custom properties
// (import '@bearsoft/auth-core/auth.css' and set --auth-*); pass the app's logo + copy.
import { useState } from 'react';
import { useAuth } from './react';
import { SSO_BLOCKED_KEY } from './client';
function message(e) {
    return e instanceof Error ? e.message : 'Something went wrong.';
}
export function AuthScreen({ copy, legacy }) {
    const { ssoConfigured, authMode, authReady, loginWithSSO, logout, resendVerification } = useAuth();
    const [blocked, setBlocked] = useState(() => localStorage.getItem(SSO_BLOCKED_KEY));
    const [showLegacy, setShowLegacy] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [resendMsg, setResendMsg] = useState('');
    const legacyMode = authMode === 'legacy' || !ssoConfigured;
    const startSso = () => {
        setError('');
        loginWithSSO().catch((e) => setError(message(e)));
    };
    const retry = () => {
        localStorage.removeItem(SSO_BLOCKED_KEY);
        setBlocked(null);
        startSso();
    };
    const exit = () => {
        localStorage.removeItem(SSO_BLOCKED_KEY);
        setBlocked(null);
        void logout();
    };
    const resend = async () => {
        setBusy(true);
        setError('');
        setResendMsg('');
        try {
            await resendVerification();
            setResendMsg('Verification email sent — click the link, then "I\'ve verified".');
        }
        catch (e) {
            setError(message(e));
        }
        finally {
            setBusy(false);
        }
    };
    function body() {
        if (!authReady)
            return _jsx("p", { className: "bsa-sub", children: "Loading\u2026" });
        // Legacy/maintenance mode (or no CR configured): the app's own form, or the built-in fallback.
        if (legacyMode && !blocked)
            return legacy ?? _jsx(BasicSignIn, {});
        // Held sign-in (unverified email) — the focused verify card.
        if (blocked && !showLegacy) {
            return (_jsxs(_Fragment, { children: [_jsx("h2", { children: "Verify your email" }), _jsx("div", { className: "bsa-note", children: blocked }), resendMsg && _jsx("div", { className: "bsa-ok", children: resendMsg }), error && _jsx("div", { className: "bsa-error", children: error }), _jsx("button", { className: "bsa-btn", onClick: resend, disabled: busy, children: busy ? 'Sending…' : 'Resend verification email' }), _jsx("button", { className: "bsa-btn bsa-btn--ghost", onClick: retry, children: "I've verified \u2014 try again" }), _jsxs("div", { className: "bsa-links", children: [_jsx("button", { className: "bsa-link", onClick: exit, children: "Log out / use a different account" }), legacy && (_jsx("button", { className: "bsa-link", onClick: () => {
                                    setError('');
                                    setShowLegacy(true);
                                }, children: "Sign in with a password instead" }))] })] }));
        }
        if (blocked && showLegacy)
            return legacy ?? _jsx(BasicSignIn, {});
        // CR mode, not held: the brand sign-in.
        return (_jsxs(_Fragment, { children: [_jsx("h2", { children: "Welcome back" }), _jsx("p", { className: "bsa-sub", children: "Sign in to continue." }), error && _jsx("div", { className: "bsa-error", children: error }), _jsx("button", { className: "bsa-btn", onClick: startSso, children: "Sign in" })] }));
    }
    return (_jsxs("div", { className: "bsa-screen", children: [_jsxs("aside", { className: "bsa-brand", children: [copy.logoUrl && _jsx("img", { src: copy.logoUrl, alt: copy.appName }), _jsx("h1", { children: copy.appName }), copy.tagline && _jsx("p", { children: copy.tagline })] }), _jsx("main", { className: "bsa-main", children: _jsx("div", { className: "bsa-card", children: body() }) })] }));
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