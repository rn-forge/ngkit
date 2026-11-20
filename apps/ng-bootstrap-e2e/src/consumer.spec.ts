import { expect, test } from '@playwright/test';

// The Bootstrap consumer fixtures (see tools/consumer/ng-bootstrap-app.mjs) are served on
// 4404 (22.0-zone) and 4405 (22.1-zoneless); each project's baseURL picks one.

interface Window$ {
  __rnfFixture?: Record<string, boolean>;
  $?: { fn: Record<string, unknown> };
  jQuery?: unknown;
}

test('plugins exist before the first render', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-test="root-section"] rnf-alert').waitFor();
  const state = await page.evaluate(() => {
    const w = window as unknown as Window$;
    return {
      recorded: w.__rnfFixture,
      same: w.$ === w.jQuery,
      bootstrapTable: typeof w.$?.fn['bootstrapTable'],
      treegrid: typeof w.$?.fn['treegrid'],
    };
  });
  expect(state.recorded).toEqual({
    jQuery: true,
    bootstrapTable: true,
    treegrid: true,
  });
  expect(state.same).toBe(true);
  expect(state.bootstrapTable).toBe('function');
  expect(state.treegrid).toBe('function');
});

test('starts without errors', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', (request) =>
    problems.push(`request failed: ${request.url()}`),
  );
  page.on('response', (response) => {
    if (response.status() >= 400)
      problems.push(`${response.status()}: ${response.url()}`);
  });
  await page.goto('/');
  await page.locator('.bootstrap-table').waitFor();
  await expect(
    page.locator('.bootstrap-table tbody tr[data-index]'),
  ).toHaveCount(3);
  expect(problems).toEqual([]);
});

test('root components render', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('[data-test="root-section"]');
  await expect(root.locator('rnf-alert')).toBeVisible();
  await expect(root.locator('rnf-button')).toBeVisible();
  const toggle = root.locator('[data-bs-toggle="dropdown"]');
  const menu = page.locator('[data-test="dropdown-menu"]');
  await expect(menu).not.toHaveClass(/show/);
  await toggle.click();
  await expect(menu).toHaveClass(/show/);
});

test('theme is applied', async ({ page }) => {
  await page.goto('/');
  const primary = page.locator('.btn-primary').first();
  await expect(primary).toBeVisible();
  await expect(primary).toHaveCSS('background-color', 'rgb(13, 110, 253)');
  const token = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue('--bs-primary')
      .trim(),
  );
  expect(token).toBe('#0d6efd');
});

test('form renders and submits', async ({ page }) => {
  await page.goto('/');
  const form = page.locator('[data-test="form-section"]');
  const input = form.locator('input[name="title"]');
  const submit = form.locator('button[type="submit"]');
  await expect(input).toBeVisible();
  // An empty required field is invalid and the submit button stays disabled.
  await expect(input).toHaveClass(/ng-invalid/);
  await expect(submit).toBeDisabled();
  await expect(page.locator('[data-test="submitted"]')).toHaveCount(0);
  await input.fill('Ada');
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.locator('[data-test="submitted"]')).toContainText('Ada');
});

test('crud lists, adds and opens delete', async ({ page }) => {
  await page.goto('/');
  const wrapper = page.locator('.bootstrap-table');
  const rows = wrapper.locator('tbody tr[data-index]');
  await expect(rows).toHaveCount(3);

  await wrapper.getByRole('button', { name: 'Add' }).click();
  const addView = page.locator('[aria-label="Add/Update View"]');
  await expect(addView).toBeVisible();
  await addView.locator('input[name="name"]').fill('Gizmo');
  await addView.getByRole('button', { name: 'Submit' }).click();
  await expect(rows).toHaveCount(4);
  await expect(wrapper).toContainText('Gizmo');

  await rows.first().locator('input[type="checkbox"]').check();
  await wrapper.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('.modal.show')).toBeVisible();
});
