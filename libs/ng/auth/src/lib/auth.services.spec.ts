import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouteService } from '@rn-forge/ng/core';
import { RN_FORGE_APP_CONFIG_TOKEN } from '@rn-forge/ng/core';
import { AuthService } from './auth.services';
import { RNF_AUTH_CONFIG_TOKEN, RnForgeAuthConfig } from './auth.config';
import {
  AllowAnyPermission,
  AnonymousCredentials,
  JwtCredentials,
  JwtToken,
} from './auth.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toBase64Url(s: string) {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function makeJwt(payload: Record<string, unknown>): string {
  return `${toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${toBase64Url(JSON.stringify(payload))}.fakesig`;
}

const FUTURE_EXP = 9_999_999_999;
const PAST_EXP = 1_000;

const TEST_PROFILE = {
  permissions: ['read', 'write'],
  groups: [{ id: 10, name: 'editors', permissions: ['edit'] }],
};

const VALID_JWT = makeJwt({
  sub: 'user@example.com',
  aud: 'my-app',
  iss: 'https://auth.example.com',
  exp: FUTURE_EXP,
  iat: 1_000_000_000,
  profile: TEST_PROFILE,
});

const EXPIRED_JWT = makeJwt({
  sub: 'user@example.com',
  aud: 'my-app',
  iss: 'https://auth.example.com',
  exp: PAST_EXP,
  iat: 1_000,
  profile: TEST_PROFILE,
});

const AUTH_ENABLED_CONFIG: RnForgeAuthConfig = {
  frontend: {
    disableAuth: false,
    loginPath: '/auth?mode=login',
    ignoreAppRoutes: ['/auth'],
  },
  backend: {},
};

function configureTestBed(authConfig: RnForgeAuthConfig) {
  return TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: { appName: 'test-app' } },
      { provide: RNF_AUTH_CONFIG_TOKEN, useValue: authConfig },
    ],
  });
}

// ---------------------------------------------------------------------------
// AllowAnyPermission
// ---------------------------------------------------------------------------

describe('AllowAnyPermission', () => {
  let perm: AllowAnyPermission;

  beforeEach(() => {
    perm = new AllowAnyPermission();
  });

  it('hasPermission returns true for any key', () => {
    expect(perm.hasPermission('super-secret')).toBe(true);
  });

  it('hasAnyPermission returns true for any set of keys', () => {
    expect(perm.hasAnyPermission('x', 'y', 'z')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AnonymousCredentials
// ---------------------------------------------------------------------------

describe('AnonymousCredentials', () => {
  let creds: AnonymousCredentials;

  beforeEach(() => {
    creds = new AnonymousCredentials();
  });

  it('isAuthenticated is false', () => {
    expect(creds.isAuthenticated).toBe(false);
  });

  it('userProfile signal returns empty object', () => {
    expect(creds.userProfile()).toEqual({});
  });

  it('hasPermission returns false for any key', () => {
    expect(creds.hasPermission('admin')).toBe(false);
  });

  it('hasAnyPermission returns false for any keys', () => {
    expect(creds.hasAnyPermission('read', 'write')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// JwtCredentials
// ---------------------------------------------------------------------------

describe('JwtCredentials', () => {
  let creds: JwtCredentials;

  beforeEach(() => {
    creds = new JwtCredentials(new JwtToken(VALID_JWT));
  });

  it('isAuthenticated is true', () => {
    expect(creds.isAuthenticated).toBe(true);
  });

  it('userProfile signal returns the profile from the JWT', () => {
    expect(creds.userProfile()).toEqual(TEST_PROFILE);
  });

  it('hasPermission returns true for a direct permission', () => {
    expect(creds.hasPermission('read')).toBe(true);
  });

  it('hasPermission returns true for a group permission', () => {
    expect(creds.hasPermission('edit')).toBe(true);
  });

  it('hasPermission returns false for an unlisted permission', () => {
    expect(creds.hasPermission('delete')).toBe(false);
  });

  it('hasAnyPermission returns true when at least one key matches', () => {
    expect(creds.hasAnyPermission('delete', 'read')).toBe(true);
  });

  it('hasAnyPermission returns false when no keys match', () => {
    expect(creds.hasAnyPermission('admin', 'delete')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AuthService — auth enabled
// ---------------------------------------------------------------------------

describe('AuthService (auth enabled)', () => {
  let service: AuthService;
  let routeService: RouteService;

  beforeEach(async () => {
    localStorage.clear();
    await configureTestBed(AUTH_ENABLED_CONFIG);
    service = TestBed.inject(AuthService);
    routeService = TestBed.inject(RouteService);
  });

  afterEach(() => TestBed.resetTestingModule());

  // ---- initial state -------------------------------------------------------

  it('isAuthenticated is false before login', () => {
    expect(service.isAuthenticated).toBe(false);
  });

  it('jwtToken is undefined before login', () => {
    expect(service.jwtToken).toBeUndefined();
  });

  it('bearerToken is empty string before login', () => {
    expect(service.bearerToken).toBe('');
  });

  it('credentials signal is AnonymousCredentials before login', () => {
    expect(service.credentials()).toBeInstanceOf(AnonymousCredentials);
    expect(service.credentials().isAuthenticated).toBe(false);
  });

  it('initialValue() returns false', () => {
    expect(service.initialValue()).toBe(false);
  });

  // ---- login with valid token -----------------------------------------------

  describe('login() with a valid JWT', () => {
    beforeEach(() => service.login(VALID_JWT));

    it('sets isAuthenticated to true', () => {
      expect(service.isAuthenticated).toBe(true);
    });

    it('stores the JwtToken instance', () => {
      expect(service.jwtToken).toBeDefined();
    });

    it('sets bearerToken to "Bearer <raw-token>"', () => {
      expect(service.bearerToken).toBe(`Bearer ${VALID_JWT}`);
    });

    it('persists the token to localStorage', () => {
      expect(localStorage.getItem('test-app._RN_FORGE_AUTH_TOKEN')).toBe(
        VALID_JWT,
      );
    });

    it('extracts user profile from JWT', () => {
      expect(service.userProfile).toEqual(TEST_PROFILE);
    });

    it('merges direct permissions with group permissions (deduped)', () => {
      expect(service.userPermissions).toEqual(
        expect.arrayContaining(['read', 'write', 'edit']),
      );
      expect(service.userPermissions).toHaveLength(3);
    });

    it('updates credentials signal to JwtCredentials', () => {
      expect(service.credentials()).toBeInstanceOf(JwtCredentials);
      expect(service.credentials().isAuthenticated).toBe(true);
    });

    it('credentials signal reflects JWT permissions', () => {
      expect(service.credentials().hasPermission('read')).toBe(true);
      expect(service.credentials().hasPermission('delete')).toBe(false);
    });

    it('publishes true to subscribers', () => {
      const received: boolean[] = [];
      service.subscribe((v) => received.push(v));
      expect(received).toContain(true);
    });
  });

  // ---- login with expired token ---------------------------------------------

  describe('login() with an expired JWT', () => {
    it('calls logout and returns undefined', () => {
      const logoutSpy = vi.spyOn(service, 'logout');
      const result = service.login(EXPIRED_JWT);
      expect(result).toBeUndefined();
      expect(logoutSpy).toHaveBeenCalled();
    });

    it('leaves isAuthenticated as false', () => {
      service.login(EXPIRED_JWT);
      expect(service.isAuthenticated).toBe(false);
    });
  });

  // ---- logout ---------------------------------------------------------------

  describe('logout()', () => {
    beforeEach(() => service.login(VALID_JWT));

    it('clears the jwt token', () => {
      service.logout();
      expect(service.jwtToken).toBeUndefined();
    });

    it('clears userProfile', () => {
      service.logout();
      expect(service.userProfile).toBeUndefined();
    });

    it('clears userPermissions', () => {
      service.logout();
      expect(service.userPermissions).toBeUndefined();
    });

    it('removes the token from localStorage', () => {
      service.logout();
      expect(localStorage.getItem('test-app._RN_FORGE_AUTH_TOKEN')).toBeNull();
    });

    it('sets isAuthenticated to false', () => {
      service.logout();
      expect(service.isAuthenticated).toBe(false);
    });

    it('resets credentials signal to AnonymousCredentials', () => {
      service.logout();
      expect(service.credentials()).toBeInstanceOf(AnonymousCredentials);
      expect(service.credentials().isAuthenticated).toBe(false);
    });

    it('publishes false to subscribers', () => {
      const received: boolean[] = [];
      service.subscribe((v) => received.push(v));
      service.logout();
      expect(received).toContain(false);
    });
  });

  // ---- token expiry detected via isAuthenticated getter --------------------

  it('triggers logout and returns false when a previously valid token expires', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));

    const nowSecs = Math.floor(Date.now() / 1000);
    const shortLivedJwt = makeJwt({
      sub: 'u',
      aud: 'a',
      iss: 'i',
      exp: nowSecs + 5,
      iat: nowSecs,
      profile: TEST_PROFILE,
    });

    service.login(shortLivedJwt);
    expect(service.isAuthenticated).toBe(true);

    vi.advanceTimersByTime(6_000);
    expect(service.isAuthenticated).toBe(false);
    expect(service.jwtToken).toBeUndefined();

    vi.useRealTimers();
  });

  // ---- session restore from localStorage ------------------------------------

  it('restores an authenticated session from a stored valid JWT on construction', async () => {
    localStorage.setItem('test-app._RN_FORGE_AUTH_TOKEN', VALID_JWT);
    TestBed.resetTestingModule();
    await configureTestBed(AUTH_ENABLED_CONFIG);
    const restored = TestBed.inject(AuthService);
    expect(restored.isAuthenticated).toBe(true);
  });

  // ---- hasPermission / hasAnyPermission ------------------------------------

  describe('hasPermission() / hasAnyPermission()', () => {
    beforeEach(() => service.login(VALID_JWT));

    it('returns true for a permission the user holds', () => {
      expect(service.hasPermission('read')).toBe(true);
    });

    it('returns false for a permission the user does not hold', () => {
      expect(service.hasPermission('delete')).toBe(false);
    });

    it('returns true when at least one of the supplied permissions matches', () => {
      expect(service.hasAnyPermission('delete', 'write')).toBe(true);
    });

    it('returns false when none of the supplied permissions match', () => {
      expect(service.hasAnyPermission('admin', 'delete')).toBe(false);
    });

    it('returns false when not authenticated', () => {
      service.logout();
      expect(service.hasAnyPermission('read')).toBe(false);
    });
  });

  // ---- sendToLogin ----------------------------------------------------------

  describe('sendToLogin()', () => {
    it('navigates to the login URL with the supplied returnUrl as a query param', () => {
      const spy = vi
        .spyOn(routeService, 'navigateByUrl')
        .mockImplementation(() => undefined);
      service.sendToLogin('/dashboard');
      expect(spy).toHaveBeenCalledOnce();
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('returnUrl=%2Fdashboard');
    });

    it('uses window.location.pathname when no returnUrl is provided', () => {
      const spy = vi
        .spyOn(routeService, 'navigateByUrl')
        .mockImplementation(() => undefined);
      service.sendToLogin();
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain('returnUrl=');
    });
  });
});
