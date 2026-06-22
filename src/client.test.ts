import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Hoisted holder so the vi.mock factory can reach the per-test manager/config.
const h = vi.hoisted(() => ({
  manager: null as unknown as Record<string, ReturnType<typeof vi.fn>> & { events: { addUserLoaded: ReturnType<typeof vi.fn> } },
  cfg: { oidcEnabled: true, oidcOnline: true, oidcAuthority: 'https://cr', oidcClientId: 'c' } as Record<string, unknown>,
}));

vi.mock('./config.js', () => ({
  loadRuntimeConfig: vi.fn(async () => h.cfg),
  getUserManager: vi.fn(async () => h.manager),
}));

import { AuthClient } from './client.js';

const okJson = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe('AuthClient', () => {
  beforeEach(() => {
    localStorage.clear();
    h.cfg = { oidcEnabled: true, oidcOnline: true, oidcAuthority: 'https://cr', oidcClientId: 'c' };
    h.manager = {
      events: { addUserLoaded: vi.fn() },
      getUser: vi.fn(async () => null),
      signinRedirect: vi.fn(),
      signinRedirectCallback: vi.fn(),
      signoutRedirect: vi.fn(),
      removeUser: vi.fn(),
    } as never;
  });
  afterEach(() => vi.unstubAllGlobals());

  it('seeds user/token from storage on construction', () => {
    localStorage.setItem('token', 't1');
    localStorage.setItem('user', JSON.stringify({ id: 'u1', email: 'a@b.c' }));
    const c = new AuthClient();
    expect(c.state.token).toBe('t1');
    expect(c.state.user).toEqual({ id: 'u1', email: 'a@b.c' });
  });

  it('init() resolves ssoConfigured/ssoOnline/ready from runtime config', async () => {
    const c = new AuthClient();
    await c.init();
    expect(c.state.ssoConfigured).toBe(true);
    expect(c.state.ssoOnline).toBe(true);
    expect(c.state.ready).toBe(true);
  });

  it('login() stores the session and notifies subscribers', async () => {
    const fetchMock = vi.fn(async () => okJson({ token: 'tok', userId: 'u9', email: 'x@y.z' }));
    vi.stubGlobal('fetch', fetchMock);
    const c = new AuthClient();
    const seen: Array<{ token: string | null }> = [];
    c.subscribe((s) => seen.push({ token: s.token }));
    await c.login('x@y.z', 'pw');
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' }));
    expect(c.state.user).toEqual({ id: 'u9', email: 'x@y.z' });
    expect(localStorage.getItem('token')).toBe('tok');
    expect(seen.at(-1)?.token).toBe('tok');
  });

  it('login() throws the server error message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okJson({ error: 'nope' }, 401)));
    await expect(new AuthClient().login('a', 'b')).rejects.toThrow('nope');
  });

  it('completeSsoCallback() maps the session via /api/auth/me on success', async () => {
    h.manager.signinRedirectCallback = vi.fn(async () => ({ access_token: 'AT', profile: { sub: 'sub123' } }));
    vi.stubGlobal('fetch', vi.fn(async () => okJson({ userId: 'guid-1', email: 'me@x.y' })));
    const c = new AuthClient();
    await c.completeSsoCallback();
    expect(c.state.user).toEqual({ id: 'guid-1', email: 'me@x.y' });
    expect(localStorage.getItem('token')).toBe('AT');
  });

  it('completeSsoCallback() clears the token and throws when /api/auth/me fails', async () => {
    h.manager.signinRedirectCallback = vi.fn(async () => ({ access_token: 'AT', profile: { sub: 'sub123' } }));
    vi.stubGlobal('fetch', vi.fn(async () => okJson({ error: 'nope' }, 500)));
    const c = new AuthClient();
    await expect(c.completeSsoCallback()).rejects.toThrow('nope');
    expect(localStorage.getItem('token')).toBeNull();
  });
});
