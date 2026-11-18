// external imports
import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
} from '@playwright/test';

const backend = 'http://localhost:8100';
const permissions = {
  'demo-admin': [
    'demo.dashboard',
    'demo.products',
    'demo.products.list',
    'demo.products.read',
    'demo.products.create',
    'demo.products.update',
    'demo.products.delete',
    'demo.products.import',
    'demo.products.export',
    'demo.forms',
    'demo.org-chart',
    'demo.products.upload',
  ],
  'demo-reader': ['demo.products', 'demo.products.list', 'demo.products.read'],
};

function cookies(response: APIResponse) {
  return Object.fromEntries(
    response
      .headersArray()
      .filter(({ name }) => name.toLowerCase() === 'set-cookie')
      .map(({ value }) => {
        const pair = value.split(';')[0];
        const equals = pair.indexOf('=');
        return [pair.slice(0, equals), pair.slice(equals + 1)];
      }),
  );
}

async function login(
  request: APIRequestContext,
  account: keyof typeof permissions,
) {
  const response = await request.get(`${backend}/auth/login/development`, {
    params: { account, return_to: '/products' },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(302);
  expect(response.headers()['location']).toBe('/products');
  const tokens = cookies(response);
  expect(tokens['__Host-session']).toBeTruthy();
  const headers = {
    Cookie: Object.entries(tokens)
      .map(([key, value]) => `${key}=${value}`)
      .join('; '),
  };
  const session = await request.get(`${backend}/auth/session`, { headers });
  expect(session.status()).toBe(200);
  Object.assign(tokens, cookies(session));
  return {
    Cookie: Object.entries(tokens)
      .map(([key, value]) => `${key}=${value}`)
      .join('; '),
    'X-XSRF-TOKEN': tokens['XSRF-TOKEN'],
  };
}

test.beforeEach(async ({ browserName }) => {
  test.skip(
    browserName !== 'chromium',
    'Direct HTTP contract needs only one project.',
  );
});

test('lists the development provider', async ({ request }) => {
  const response = await request.get(`${backend}/auth/providers`);
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual([
    expect.objectContaining({ id: 'development', kind: 'development' }),
  ]);
});

test('anonymous session sets the CSRF cookie', async ({ request }) => {
  const response = await request.get(`${backend}/auth/session`);
  expect(response.status()).toBe(401);
  expect(cookies(response)['XSRF-TOKEN']).toBeTruthy();
});

for (const account of ['demo-admin', 'demo-reader'] as const) {
  test(`${account} receives its exact permissions`, async ({ request }) => {
    const headers = await login(request, account);
    const response = await request.get(`${backend}/auth/session`, { headers });
    expect(response.status()).toBe(200);
    const session = await response.json();
    expect(session.subject).toBe(account);
    expect(session.permissions.sort()).toEqual(
      [...permissions[account]].sort(),
    );
  });
}

test('unsafe request without the CSRF header is refused', async ({
  request,
}) => {
  const { Cookie } = await login(request, 'demo-admin');
  const response = await request.post(`${backend}/api/_test/reset`, {
    headers: { Cookie },
  });
  expect(response.status()).toBe(403);
  expect(response.headers()['content-type']).toContain(
    'application/problem+json',
  );
  expect((await response.json()).type).toMatch(/csrf-failed$/);
});

test('reader can list but only admin can update', async ({ request }) => {
  for (const account of ['demo-reader', 'demo-admin'] as const) {
    const headers = await login(request, account);
    const list = await request.get(`${backend}/api/products`, { headers });
    expect(list.status()).toBe(200);
    const current = await request.get(`${backend}/api/products/1`, { headers });
    expect(current.status()).toBe(200);
    const response = await request.patch(`${backend}/api/products/1`, {
      headers: {
        ...headers,
        'If-Match': current.headers()['etag'],
        'Content-Type': 'application/merge-patch+json',
      },
      data: { name: 'Widget A' },
    });
    expect(response.status()).toBe(account === 'demo-reader' ? 403 : 200);
  }
});

test('anonymous products request is refused', async ({ request }) => {
  const session = await request.get(`${backend}/auth/session`);
  expect(session.status()).toBe(401);
  const response = await request.get(`${backend}/api/products`, {
    headers: { Cookie: '' },
  });
  expect(response.status()).toBe(401);
});

test('logout revokes the old session', async ({ request }) => {
  const headers = await login(request, 'demo-admin');
  const response = await request.post(`${backend}/auth/logout`, { headers });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ redirect: null });
  const session = await request.get(`${backend}/auth/session`, { headers });
  expect(session.status()).toBe(401);
});
