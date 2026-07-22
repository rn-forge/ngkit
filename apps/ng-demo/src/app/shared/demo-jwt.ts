// Pre-baked JWTs for demo app — no real auth endpoint needed.
// Tokens have exp: 9999999999 so they never expire.

function base64url(obj: object): string {
  return btoa(JSON.stringify(obj))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function buildJwt(payload: object): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const body = base64url(payload);
  return `${header}.${body}.demo-signature`;
}

const FULL_ACCESS_PAYLOAD = {
  sub: 'admin@example.com',
  aud: 'ng-demo',
  iss: 'rn-forge',
  exp: 9999999999,
  iat: 1000000000,
  profile: {
    permissions: [
      'demo.dashboard',
      'demo.products',
      'demo.forms',
      'demo.org-chart',
    ],
    groups: ['demo-users'],
  },
};

const READ_ONLY_PAYLOAD = {
  sub: 'readonly@example.com',
  aud: 'ng-demo',
  iss: 'rn-forge',
  exp: 9999999999,
  iat: 1000000000,
  profile: {
    permissions: ['demo.dashboard'],
    groups: ['demo-users'],
  },
};

export const FULL_ACCESS_JWT = buildJwt(FULL_ACCESS_PAYLOAD);
export const READ_ONLY_JWT = buildJwt(READ_ONLY_PAYLOAD);

export const DEMO_USERS = [
  { email: 'admin@example.com', name: 'Admin (full access)' },
  { email: 'readonly@example.com', name: 'Read-Only (dashboard only)' },
];

export function getJwtForEmail(email: string): string {
  return email === 'readonly@example.com' ? READ_ONLY_JWT : FULL_ACCESS_JWT;
}
