import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// The one canonical CrimsonRaven sign-in card, shared by every OfBirds app so the screen is identical
// across them — only the wordmark and the accent colour (via --auth-* CSS vars) differ per app. Based
// on the MulberryHeron look (soft ground, centered surface card). The engine has already tried a
// SILENT (prompt=none) SSO on load: if a session existed you're in and never see this; otherwise it
// shows one explicit "Sign in with Crimson Raven" button. We never auto-fire the interactive redirect
// (auto-parking on Keycloak's form is what looped restart-cookie across tabs).
import { useState } from 'react';
import { useAuth } from './react.js';
function message(e) {
    return e instanceof Error ? e.message : 'Something went wrong.';
}
export function SsoCard({ brand, subtitle = 'Sign in to continue' }) {
    const { needsInteractiveLogin, loginWithSSO, logout } = useAuth();
    const [error, setError] = useState('');
    const startSso = () => {
        setError('');
        loginWithSSO().catch((e) => setError(message(e)));
    };
    return (_jsx("div", { className: "bsa-screen", children: _jsxs("div", { className: "bsa-card", children: [_jsx("h1", { className: "bsa-brand", children: brand }), error ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "bsa-error", children: error }), _jsx("button", { className: "bsa-btn", onClick: startSso, children: "Try again" }), _jsx("button", { className: "bsa-link", onClick: () => void logout(), children: "Log out and start over" })] })) : needsInteractiveLogin ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "bsa-sub", children: subtitle }), _jsx("button", { className: "bsa-btn", onClick: startSso, children: "Sign in with Crimson Raven" })] })) : (_jsx("p", { className: "bsa-sub", children: "Signing you in\u2026" }))] }) }));
}
//# sourceMappingURL=SsoCard.js.map