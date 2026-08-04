// Standardized auth screen. In CrimsonRaven mode it renders the shared SsoCard (identical across every
// app; Keycloak hosts the real login/registration/verify/forgot pages). In legacy (break-glass) mode
// it renders the app's own password form inside the same card shell. Theme via '@bearsoft/auth-core/auth.css'.
import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from './react.js';
import { SsoCard } from './SsoCard.js';

export interface AuthScreenProps {
  /** App wordmark shown on the card (e.g. "Mulberry Heron"). */
  brand: string;
  /**
   * App-specific legacy email/password form, shown only in legacy (maintenance) mode. If omitted, a
   * minimal built-in sign-in form is used as the break-glass default.
   */
  legacy?: ReactNode;
}

export function AuthScreen({ brand, legacy }: AuthScreenProps) {
  const { ssoConfigured, authMode, authReady } = useAuth();
  const legacyMode = authMode === 'legacy' || !ssoConfigured;

  if (!authReady) {
    return (
      <div className="bsa-screen">
        <div className="bsa-card">
          <p className="bsa-sub">Loading…</p>
        </div>
      </div>
    );
  }

  if (legacyMode) {
    return (
      <div className="bsa-screen">
        <div className="bsa-card">
          <h1 className="bsa-brand">{brand}</h1>
          {legacy ?? <BasicSignIn />}
        </div>
      </div>
    );
  }

  return <SsoCard brand={brand} />;
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
      setError(err instanceof Error ? err.message : 'Something went wrong.');
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
