// Framework-agnostic engine entry point. The reactivity adapters live in subpath exports
// (`@bearsoft/auth-core/react`, `@bearsoft/auth-core/angular`).
export { AuthClient, SSO_BLOCKED_KEY, SSO_PENDING_KEY } from './client';
export type { AuthUser, AuthState, AuthClientOptions } from './client';
export { loadRuntimeConfig, getUserManager } from './config';
export type { RuntimeConfig } from './config';
