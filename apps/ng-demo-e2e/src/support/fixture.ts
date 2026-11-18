// external imports
import type { Page } from '@playwright/test';

export async function signIn(page: Page, account: string): Promise<void> {
  await page.goto(
    `/auth/login/development?account=${encodeURIComponent(account)}&return_to=/products`,
  );
  await page.waitForURL('**/products');
}

export async function xsrfHeaders(page: Page): Promise<Record<string, string>> {
  const cookie = (await page.context().cookies()).find(
    ({ name }) => name === 'XSRF-TOKEN',
  );
  if (!cookie) throw new Error('Fixture did not set the XSRF-TOKEN cookie.');
  return { 'X-XSRF-TOKEN': cookie.value };
}

export async function resetFixture(page: Page): Promise<void> {
  let headers: Record<string, string>;
  try {
    headers = await xsrfHeaders(page);
  } catch {
    await page.request.get('/auth/session');
    headers = await xsrfHeaders(page);
  }
  const reset = await page.request.post('/api/_test/reset', { headers });
  if (!reset.ok()) {
    throw new Error(`Fixture reset failed with status ${reset.status()}.`);
  }
}
