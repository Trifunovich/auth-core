// Minimal auth screen. In CrimsonRaven mode it just bounces to Keycloak (which hosts the themed
// login / registration / verify-email / forgot-password pages) and shows a "Signing you in…" spinner;
// on failure it offers a retry plus a clean "log out and start over". In legacy (break-glass) mode it
// renders the app's own password form. Theme the small spinner/card via '@bearsoft/auth-core/auth.css'.
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from './react.js';

export interface AuthScreenProps {
  /**
   * App-specific legacy email/password form, shown only in legacy (maintenance) mode. If omitted, a
   * minimal built-in sign-in form is used as the break-glass default.
   */
  legacy?: ReactNode;
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

export function AuthScreen({ legacy }: AuthScreenProps) {
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
    if (!authReady || legacyMode) return;
    loginWithSSO().catch((e) => setError(message(e)));
  }, [authReady, legacyMode, loginWithSSO]);

  function body(): ReactNode {
    if (!authReady) return <p className="bsa-sub">Loading…</p>;
    if (legacyMode) return legacy ?? <BasicSignIn />;
    if (error) {
      return (
        <>
          <div className="bsa-error">{error}</div>
          <button className="bsa-btn" onClick={startSso}>
            Try again
          </button>
          <button className="bsa-link" onClick={() => void logout()}>
            Log out and start over
          </button>
        </>
      );
    }
    return <p className="bsa-sub">Signing you in…</p>;
  }

  return (
    <div className="bsa-screen">
      <div className="bsa-card">{body()}</div>
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
