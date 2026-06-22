// Framework-agnostic engine entry point. The reactivity adapters live in subpath exports
// (`@bearsoft/auth-core/react`, `@bearsoft/auth-core/angular`).
export { AuthClient, SSO_BLOCKED_KEY, SSO_PENDING_KEY } from './client.js';
export type { AuthUser, AuthState, AuthClientOptions } from './client.js';
export { loadRuntimeConfig, getUserManager } from './config.js';
export type { RuntimeConfig } from './config.js';
