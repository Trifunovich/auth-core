# @bearsoft/auth-core

Framework-agnostic **CrimsonRaven (Zitadel) SSO** engine on [`oidc-client-ts`], shared by the React apps
(Fuel, ThoseDays, fullstack-template) and the Angular app (MulberryHeron). All the auth state-machine
logic — runtime config, PKCE, the unverified-email **hold**, resend, `/api/auth/me` mapping, race-safe
logout — lives here once; the framework adapters only mirror state into React/Angular reactivity.

## Install (git-URL, pinned to a tag)

No registry. `dist/` is committed, so installs need no build step:

```jsonc
// package.json
"dependencies": {
  "@bearsoft/auth-core": "github:Trifunovich/auth-core#v0.1.0"
}
```

Bump = retag the repo and bump the `#vX` ref in each consumer.

## React

```tsx
import { AuthProvider, useAuth, SSO_BLOCKED_KEY } from '@bearsoft/auth-core/react';

// wrap the app in <AuthProvider>, then:
const { user, ssoOnline, loginWithSSO, completeSsoCallback, resendVerification, logout } = useAuth();
```

The logo hook (and anything else) can read runtime config directly from the engine:

```ts
import { loadRuntimeConfig } from '@bearsoft/auth-core';
```

## Angular

`@bearsoft/auth-core/angular` — added in the MulberryHeron migration (an `@Injectable` exposing
`signal()`s over the same `AuthClient`).

## Backend contract (every consumer's API exposes)

| Endpoint | Purpose |
|---|---|
| `GET /api/config` | `{oidcEnabled, oidcOnline, oidcAuthority, oidcClientId, oidcLogoUrl, oidcLogoUrlDark}` |
| `GET /api/auth/me` | maps the IdP `sub` → internal stable user id; `403 {error:"email_unverified"}` to hold |
| `POST /api/auth/resend-verification` | sends a fresh code via CrimsonRaven `SendEmailCode` (app-mailer PAT) |
| `POST /api/auth/login`, `/register` | optional local email/password fallback (dual-auth apps) |

## Develop

```bash
npm install
npm test        # vitest (jsdom)
npm run build   # tsc → dist/  (commit dist/ before tagging)
```

[`oidc-client-ts`]: https://github.com/authts/oidc-client-ts
