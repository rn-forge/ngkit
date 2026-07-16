import {
  AllowAnyPermission,
  AnonymousCredentials,
  JwtCredentials,
  JwtToken,
} from './auth.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

const FUTURE_EXP = 9_999_999_999;
const PAST_EXP = 1000;

const BASE_PAYLOAD = {
  token_type: 'Bearer',
  jti: 'tok-id-001',
  iss: 'https://auth.example.com',
  sub: 'user@example.com',
  aud: 'my-app',
  exp: FUTURE_EXP,
  iat: 1_000_000_000,
};

const TEST_PROFILE = {
  id: 1,
  email: 'user@example.com',
  permissions: ['read', 'write'],
  groups: [{ id: 10, name: 'editors', permissions: ['edit'] }],
};

// ---------------------------------------------------------------------------
// JwtToken
// ---------------------------------------------------------------------------

describe('JwtToken', () => {
  describe('constructor — field mapping', () => {
    let token: JwtToken;

    beforeEach(() => {
      token = new JwtToken(makeJwt(BASE_PAYLOAD));
    });

    it('stores the raw token string', () => {
      const raw = makeJwt(BASE_PAYLOAD);
      expect(new JwtToken(raw).token).toBe(raw);
    });

    it('maps token_type → type', () => {
      expect(token.type).toBe('Bearer');
    });

    it('maps jti → id', () => {
      expect(token.id).toBe('tok-id-001');
    });

    it('maps iss → issuer', () => {
      expect(token.issuer).toBe('https://auth.example.com');
    });

    it('maps sub → subject', () => {
      expect(token.subject).toBe('user@example.com');
    });

    it('maps aud → audience (string stays a string)', () => {
      expect(token.audience).toBe('my-app');
    });

    it('maps exp → expiry and converts seconds to milliseconds', () => {
      expect(token.expiry).toBe(FUTURE_EXP * 1000);
    });

    it('maps iat → issuedAt', () => {
      expect(token.issuedAt).toBe(1_000_000_000);
    });

    it('preserves unmapped claims under their original key', () => {
      const jwt = makeJwt({ ...BASE_PAYLOAD, custom_role: 'admin' });
      const t = new JwtToken(jwt);
      expect(t.getAttribute<string>('custom_role')).toBe('admin');
    });
  });

  describe('audience array handling', () => {
    it('flattens an array audience to its first element', () => {
      const jwt = makeJwt({
        ...BASE_PAYLOAD,
        aud: ['primary-app', 'secondary-app'],
      });
      const token = new JwtToken(jwt);
      expect(token.audience).toBe('primary-app');
    });

    it('leaves a single-string audience unchanged', () => {
      const jwt = makeJwt({ ...BASE_PAYLOAD, aud: 'single-app' });
      const token = new JwtToken(jwt);
      expect(token.audience).toBe('single-app');
    });
  });

  describe('isValid', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
    });

    afterEach(() => vi.useRealTimers());

    it('returns true when expiry is in the future', () => {
      const token = new JwtToken(makeJwt({ ...BASE_PAYLOAD, exp: FUTURE_EXP }));
      expect(token.isValid).toBe(true);
    });

    it('returns false when expiry is in the past', () => {
      const token = new JwtToken(makeJwt({ ...BASE_PAYLOAD, exp: PAST_EXP }));
      expect(token.isValid).toBe(false);
    });

    it('returns false when expiry equals the current millisecond exactly', () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const token = new JwtToken(makeJwt({ ...BASE_PAYLOAD, exp: nowSeconds }));
      expect(token.isValid).toBe(false);
    });
  });

  describe('getAttribute()', () => {
    it('retrieves a top-level attribute', () => {
      const token = new JwtToken(makeJwt(BASE_PAYLOAD));
      expect(token.getAttribute<string>('subject')).toBe('user@example.com');
    });

    it('returns undefined for a missing attribute', () => {
      const token = new JwtToken(makeJwt(BASE_PAYLOAD));
      expect(token.getAttribute('nonexistent')).toBeUndefined();
    });
  });

  describe('setAttribute()', () => {
    it('sets a new attribute on the token instance', () => {
      const token = new JwtToken(makeJwt(BASE_PAYLOAD));
      token.setAttribute('dynamic', 'value');
      expect(token.getAttribute<string>('dynamic')).toBe('value');
    });

    it('overwrites an existing attribute', () => {
      const token = new JwtToken(makeJwt(BASE_PAYLOAD));
      token.setAttribute('subject', 'overridden@example.com');
      expect(token.getAttribute<string>('subject')).toBe(
        'overridden@example.com',
      );
    });
  });
});

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
    expect(perm.hasPermission('')).toBe(true);
  });

  it('hasAnyPermission returns true for any set of keys', () => {
    expect(perm.hasAnyPermission('x', 'y', 'z')).toBe(true);
  });

  it('hasAnyPermission returns true for empty keys', () => {
    expect(perm.hasAnyPermission()).toBe(true);
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
    expect(creds.hasPermission('read')).toBe(false);
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
    creds = new JwtCredentials(
      new JwtToken(makeJwt({ ...BASE_PAYLOAD, profile: TEST_PROFILE })),
    );
  });

  it('isAuthenticated is true', () => {
    expect(creds.isAuthenticated).toBe(true);
  });

  it('userProfile signal returns the profile from the JWT', () => {
    expect(creds.userProfile()).toEqual(TEST_PROFILE);
  });

  it('hasPermission returns true for a direct permission', () => {
    expect(creds.hasPermission('read')).toBe(true);
    expect(creds.hasPermission('write')).toBe(true);
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

  it('deduplicates merged permissions from direct and group sources', () => {
    const profileWithOverlap = {
      permissions: ['read'],
      groups: [{ id: 1, name: 'g1', permissions: ['read', 'extra'] }],
    };
    const credsWithOverlap = new JwtCredentials(
      new JwtToken(makeJwt({ ...BASE_PAYLOAD, profile: profileWithOverlap })),
    );
    expect(credsWithOverlap.hasPermission('read')).toBe(true);
    expect(credsWithOverlap.hasPermission('extra')).toBe(true);
  });
});
