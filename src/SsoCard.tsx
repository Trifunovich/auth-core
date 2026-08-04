// The one canonical CrimsonRaven sign-in card, shared by every OfBirds app so the screen is identical
// across them — only the wordmark and the accent colour (via --auth-* CSS vars) differ per app. Based
// on the MulberryHeron look (soft ground, centered surface card). The engine has already tried a
// SILENT (prompt=none) SSO on load: if a session existed you're in and never see this; otherwise it
// shows one explicit "Sign in with Crimson Raven" button. We never auto-fire the interactive redirect
// (auto-parking on Keycloak's form is what looped restart-cookie across tabs).
import { useState, type ReactNode } from 'react';
import { useAuth } from './react.js';

function message(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

export interface SsoCardProps {
  /** App wordmark shown at the top of the card (e.g. "Mulberry Heron"). */
  brand: string;
  /** Line under the wordmark on the sign-in state. */
  subtitle?: string;
}

export function SsoCard({ brand, subtitle = 'Sign in to continue' }: SsoCardProps): ReactNode {
  const { needsInteractiveLogin, loginWithSSO, logout } = useAuth();
  const [error, setError] = useState('');
  const startSso = () => {
    setError('');
    loginWithSSO().catch((e) => setError(message(e)));
  };

  return (
    <div className="bsa-screen">
      <div className="bsa-card">
        <h1 className="bsa-brand">{brand}</h1>
        {error ? (
          <>
            <p className="bsa-error">{error}</p>
            <button className="bsa-btn" onClick={startSso}>
              Try again
            </button>
            <button className="bsa-link" onClick={() => void logout()}>
              Log out and start over
            </button>
          </>
        ) : needsInteractiveLogin ? (
          <>
            <p className="bsa-sub">{subtitle}</p>
            <button className="bsa-btn" onClick={startSso}>
              Sign in with Crimson Raven
            </button>
          </>
        ) : (
          <p className="bsa-sub">Signing you in…</p>
        )}
      </div>
    </div>
  );
}
