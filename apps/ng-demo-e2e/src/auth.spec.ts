// external imports
import { expect, type Page, test } from '@playwright/test';

// internal imports
import { resetFixture, signIn, xsrfHeaders } from './support/fixture';

const list = (page: Page) => page.locator('[aria-label="List View"]');
const row = (page: Page, name: string) =>
  page.locator('tbody tr', { hasText: name });

test.describe('Authentication acceptance', () => {
  test('signs in from an anonymous products visit', async ({ page }) => {
    await page.goto('/products');
    await expect(page).toHaveURL(
      /\/auth\/login\/development\?return_to=%2Fproducts$/,
    );

    await page.goto(`${page.url()}&account=demo-admin`);
    await expect(page).toHaveURL(/\/products$/);
    await expect(list(page)).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible();
    await expect(page.locator('rnf-user-menu')).toContainText(
      'Signed in with development',
    );
  });

  test('hides write actions from a read-only account', async ({ page }) => {
    await signIn(page, 'demo-reader');
    await expect(list(page)).toBeVisible();
    for (const name of ['Add', 'Update', 'Delete']) {
      await expect(list(page).getByRole('button', { name })).toHaveCount(0);
    }
  });

  test('rejects a reader PATCH while keeping the session', async ({ page }) => {
    await signIn(page, 'demo-admin');
    await resetFixture(page);
    await page.route('**/auth/session', async (route) => {
      const response = await route.fetch();
      if (response.status() !== 200) return route.fulfill({ response });
      const session = await response.json();
      session.permissions = [...session.permissions, 'demo.products.update'];
      await route.fulfill({ response, json: session });
    });
    await signIn(page, 'demo-reader');

    await expect(list(page)).toBeVisible();
    await row(page, 'Widget A').locator('input[type="checkbox"]').check();
    await list(page).getByRole('button', { name: 'Update' }).click();
    const form = page.locator('[aria-label="Add/Update View"]');
    await expect(form).toBeVisible();
    await form.getByLabel('Name').fill('Reader Edit');
    const patchResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().includes('/api/products'),
    );
    await form.getByRole('button', { name: 'Submit' }).click();
    expect((await patchResponse).status()).toBe(403);
    await expect(page).toHaveURL(/\/forbidden$/);

    await page.unroute('**/auth/session');
    const session = await page.request.get('/auth/session');
    expect(session.status()).toBe(200);
  });

  test('returns to login when the fixture ends the session', async ({
    page,
  }) => {
    await signIn(page, 'demo-admin');
    await expect(page.locator('tbody tr').first()).toBeVisible();
    const logout = await page.request.post('/auth/logout/all', {
      headers: await xsrfHeaders(page),
    });
    expect(logout.status()).toBe(200);

    const listResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/api/products'),
    );
    await page.locator('th', { hasText: 'Name' }).first().click();
    expect((await listResponse).status()).toBe(401);
    await expect(page).toHaveURL(
      /\/auth\/login\/development\?return_to=%2Fproducts$/,
    );
  });

  test('guards against a session cookie the browser did not store', async ({
    page,
  }) => {
    await page.route(
      (url) =>
        url.pathname === '/auth/login/development' &&
        url.searchParams.has('account'),
      async (route) => {
        const response = await route.fetch({ maxRedirects: 0 });
        await page.context().clearCookies({ name: '__Host-session' });
        const headers = { ...response.headers() };
        delete headers['set-cookie'];
        await route.fulfill({
          status: response.status(),
          headers,
          body: await response.body(),
        });
      },
    );

    await page.goto('/products');
    await expect(page).toHaveURL(
      /\/auth\/login\/development\?return_to=%2Fproducts$/,
    );
    await page.goto(`${page.url()}&account=demo-admin`);
    await expect(page).toHaveURL(
      /\/login\/error\?error=session_not_established$/,
    );
    // The delay verifies the one-shot loop guard does not redirect afterward.
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(
      /\/login\/error\?error=session_not_established$/,
    );
  });

  test('signs out and ends the server session', async ({ page }) => {
    await signIn(page, 'demo-admin');
    await page.locator('rnf-user-menu button.dropdown-toggle').click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/auth\/login\/development\?return_to=%2F$/);

    const session = await page.request.get('/auth/session');
    expect(session.status()).toBe(401);
  });
});
