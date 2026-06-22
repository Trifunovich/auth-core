// Standardized Split-panel auth screen. In CR mode it's a brand panel + a "Sign in" button + the
// unverified-email "verify your email" card. The legacy email/password form is maintenance-only, so the
// app injects its own (the `legacy` slot) — or gets a minimal built-in. Theme via CSS custom properties
// (import '@bearsoft/auth-core/auth.css' and set --auth-*); pass the app's logo + copy.
import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from './react.js';
import { SSO_BLOCKED_KEY } from './client.js';

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

function message(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

export function AuthScreen({ copy, legacy }: AuthScreenProps) {
  const { ssoConfigured, authMode, authReady, loginWithSSO, logout, resendVerification } = useAuth();
  const [blocked, setBlocked] = useState<string | null>(() => localStorage.getItem(SSO_BLOCKED_KEY));
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
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  function body(): ReactNode {
    if (!authReady) return <p className="bsa-sub">Loading…</p>;

    // Legacy/maintenance mode (or no CR configured): the app's own form, or the built-in fallback.
    if (legacyMode && !blocked) return legacy ?? <BasicSignIn />;

    // Held sign-in (unverified email) — the focused verify card.
    if (blocked && !showLegacy) {
      return (
        <>
          <h2>Verify your email</h2>
          <div className="bsa-note">{blocked}</div>
          {resendMsg && <div className="bsa-ok">{resendMsg}</div>}
          {error && <div className="bsa-error">{error}</div>}
          <button className="bsa-btn" onClick={resend} disabled={busy}>
            {busy ? 'Sending…' : 'Resend verification email'}
          </button>
          <button className="bsa-btn bsa-btn--ghost" onClick={retry}>
            I've verified — try again
          </button>
          <div className="bsa-links">
            <button className="bsa-link" onClick={exit}>
              Log out / use a different account
            </button>
            {legacy && (
              <button
                className="bsa-link"
                onClick={() => {
                  setError('');
                  setShowLegacy(true);
                }}
              >
                Sign in with a password instead
              </button>
            )}
          </div>
        </>
      );
    }

    if (blocked && showLegacy) return legacy ?? <BasicSignIn />;

    // CR mode, not held: the brand sign-in.
    return (
      <>
        <h2>Welcome back</h2>
        <p className="bsa-sub">Sign in to continue.</p>
        {error && <div className="bsa-error">{error}</div>}
        <button className="bsa-btn" onClick={startSso}>
          Sign in
        </button>
      </>
    );
  }

  return (
    <div className="bsa-screen">
      <aside className="bsa-brand">
        {copy.logoUrl && <img src={copy.logoUrl} alt={copy.appName} />}
        <h1>{copy.appName}</h1>
        {copy.tagline && <p>{copy.tagline}</p>}
      </aside>
      <main className="bsa-main">
        <div className="bsa-card">{body()}</div>
      </main>
    </div>
  );
}

/** Minimal built-in legacy sign-in (email + password). Apps with register/forgot pass their own via
 *  the `legacy` slot; this is the break-glass default for maintenance mode. */
function BasicSignIn() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bsa-form">
      <h2>Sign in</h2>
      <div className="bsa-field">
        <label htmlFor="bsa-email">Email</label>
        <input id="bsa-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="bsa-field">
        <label htmlFor="bsa-pass">Password</label>
        <input
          id="bsa-pass"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <div className="bsa-error">{error}</div>}
      <button className="bsa-btn" type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
