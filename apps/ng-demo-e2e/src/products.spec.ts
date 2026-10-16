import { expect, type Page, test } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const list = (page: Page) => page.locator('[aria-label="List View"]');
const form = (page: Page) => page.locator('[aria-label="Add/Update View"]');
const importView = (page: Page) => page.locator('[aria-label="Import View"]');
const row = (page: Page, name: string) =>
  page.locator('tbody tr', { hasText: name });

async function gotoProducts(page: Page) {
  await page.goto('/products');
  await list(page).waitFor();
  await page.locator('tbody tr').first().waitFor();
}

async function openImport(page: Page) {
  await list(page).getByRole('button', { name: 'Import' }).click();
  await expect(importView(page)).toBeVisible();
}

function csv(lines: string[]) {
  return {
    name: 'rows.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(lines.join('\n') + '\n'),
  };
}

// ---------------------------------------------------------------------------
// Products e2e. The DB is shared, so the suite runs serially and every test
// starts from seed: `POST /api/_test/reset` is the one fixture contract the
// specs rely on besides the standards.
// ---------------------------------------------------------------------------

test.describe('Products page', () => {
  test.beforeEach(async ({ page, request }) => {
    const reset = await request.post('/api/_test/reset');
    expect(reset.ok()).toBe(true);
    await gotoProducts(page);
  });

  // List -------------------------------------------------------------------

  test('loads seed products in the table', async ({ page }) => {
    await expect(page.locator('tbody tr')).toHaveCount(5);
    for (const name of [
      'Widget A',
      'Widget B',
      'Gadget X',
      'Gadget Y',
      'Doohickey',
    ]) {
      await expect(list(page).getByText(name)).toBeVisible();
    }
  });

  test('shows the correct toolbar buttons', async ({ page }) => {
    for (const name of ['Add', 'Update', 'Delete', 'Import', 'Export']) {
      await expect(list(page).getByRole('button', { name })).toBeVisible();
    }
  });

  test('sorting by name descending sends orderBy and shows the server order', async ({
    page,
  }) => {
    const firstName = () =>
      page.locator('tbody tr').first().locator('td').nth(2);
    const header = page.locator('th', { hasText: 'Name' }).first();
    await header.click();
    const request = page.waitForRequest(
      (r) =>
        r.url().includes('/api/products') &&
        decodeURIComponent(r.url()).includes('orderBy') &&
        /desc|-name/i.test(decodeURIComponent(r.url())),
    );
    await header.click();
    await request;
    await expect(firstName()).toHaveText('Widget B');
  });

  test('a declared filter narrows the list and paging shows no total', async ({
    page,
  }) => {
    await page
      .getByLabel('Category', { exact: true })
      .first()
      .selectOption('Gadgets');
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await expect(page.getByText('Gadget Y')).toBeVisible();

    const pager = page.getByRole('navigation', { name: 'Pagination' });
    await expect(pager.getByText('Page 1')).toBeVisible();
    await expect(pager.getByText('total')).toHaveCount(0);
    await expect(
      pager.getByRole('button', { name: 'Previous' }),
    ).toBeDisabled();
    await expect(pager.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  // Create -----------------------------------------------------------------

  test('adds a product and shows it in the list', async ({ page }) => {
    await list(page).getByRole('button', { name: 'Add' }).click();
    await expect(form(page)).toBeVisible();

    await form(page).getByLabel('Name').fill('Test Widget');
    await form(page).getByLabel('Category').selectOption('Widgets');
    await form(page).getByLabel('Price').fill('24.99');
    await form(page).getByLabel('Active').selectOption('true');
    await form(page).getByRole('button', { name: 'Submit' }).click();

    await expect(list(page)).toBeVisible();
    await expect(page.getByText('Added Product successfully')).toBeVisible();
    await expect(row(page, 'Test Widget')).toHaveCount(1);
    await expect(page.locator('tbody tr')).toHaveCount(6);
  });

  test('cancel add returns to list view', async ({ page }) => {
    await list(page).getByRole('button', { name: 'Add' }).click();
    await expect(form(page)).toBeVisible();
    await form(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(list(page)).toBeVisible();
  });

  // Update (get + PATCH with ETag) -------------------------------------------

  test('updates a product and shows the edited name', async ({ page }) => {
    await row(page, 'Widget A').locator('input[type="checkbox"]').check();
    await list(page).getByRole('button', { name: 'Update' }).click();
    await expect(form(page)).toBeVisible();

    await form(page).getByLabel('Name').fill('Updated Widget');
    await form(page).getByRole('button', { name: 'Submit' }).click();

    await expect(list(page)).toBeVisible();
    await expect(page.getByText('Updated Product successfully')).toBeVisible();
    await expect(row(page, 'Updated Widget')).toHaveCount(1);
    await expect(row(page, 'Widget A')).toHaveCount(0);
  });

  test('a row changed behind the screen offers a reload on save (412)', async ({
    page,
    request,
  }) => {
    await row(page, 'Widget A').locator('input[type="checkbox"]').check();
    await list(page).getByRole('button', { name: 'Update' }).click();
    await expect(form(page)).toBeVisible();
    await expect(form(page).getByLabel('Name')).toHaveValue('Widget A');

    // Someone else changes the row after the screen read it.
    const current = await request.get('/api/products/1');
    const etag = current.headers()['etag'];
    expect(etag).toBeTruthy();
    const patched = await request.patch('/api/products/1', {
      headers: {
        'Content-Type': 'application/merge-patch+json',
        'If-Match': etag,
      },
      data: { name: 'Changed Elsewhere' },
    });
    expect(patched.ok()).toBe(true);

    await form(page).getByLabel('Name').fill('My Edit');
    await form(page).getByRole('button', { name: 'Submit' }).click();

    await expect(
      page.getByText('This record was changed by someone else.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Reload latest' }).click();
    await expect(
      page.getByText('This record was changed by someone else.'),
    ).toBeHidden();

    // The edits are kept and the retry now carries the fresh ETag.
    await form(page).getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Updated Product successfully')).toBeVisible();
    await expect(row(page, 'My Edit')).toHaveCount(1);
  });

  // Delete -----------------------------------------------------------------

  test('deletes one product after modal confirmation', async ({ page }) => {
    await row(page, 'Doohickey').locator('input[type="checkbox"]').check();
    await list(page).getByRole('button', { name: 'Delete' }).click();

    const modal = page.locator('.modal.show');
    await expect(modal).toBeVisible();
    await expect(
      modal.getByText('Are you sure you want to delete'),
    ).toBeVisible();

    const request = page.waitForRequest(
      (r) => r.method() !== 'GET' && r.url().includes('/api/products'),
    );
    await modal.getByRole('button', { name: 'Delete' }).click();
    const sent = await request;
    // The screen sends one `:batchDelete` even for a single row.
    expect(sent.url()).toContain(':batchDelete');

    await expect(page.locator('.modal.show')).toBeHidden();
    await expect(
      page.getByText('Deleted 1 Product successfully'),
    ).toBeVisible();
    await expect(row(page, 'Doohickey')).toHaveCount(0);
    await expect(page.locator('tbody tr')).toHaveCount(4);
  });

  test('deletes two selected products with one batch request', async ({
    page,
  }) => {
    await row(page, 'Widget A').locator('input[type="checkbox"]').check();
    await row(page, 'Gadget X').locator('input[type="checkbox"]').check();
    await list(page).getByRole('button', { name: 'Delete' }).click();

    const request = page.waitForRequest(
      (r) => r.method() !== 'GET' && r.url().includes('/api/products'),
    );
    await page
      .locator('.modal.show')
      .getByRole('button', { name: 'Delete' })
      .click();
    const sent = await request;
    expect(sent.method()).toBe('POST');
    expect(sent.url()).toContain(':batchDelete');

    await expect(
      page.getByText('Deleted 2 Products successfully'),
    ).toBeVisible();
    await expect(row(page, 'Widget A')).toHaveCount(0);
    await expect(row(page, 'Gadget X')).toHaveCount(0);
    await expect(page.locator('tbody tr')).toHaveCount(3);
  });

  // Import -----------------------------------------------------------------

  test('navigates to import view and back via cancel', async ({ page }) => {
    await openImport(page);
    // List view is hidden while in import mode
    await expect(list(page)).toBeHidden();
    await importView(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(list(page)).toBeVisible();
  });

  test('imports in two steps: validate leaves the list alone, import commits', async ({
    page,
  }) => {
    await openImport(page);
    await importView(page)
      .getByLabel('Import file')
      .setInputFiles(
        csv([
          'id,name,category,price,active',
          ',Imported Gizmo,Other,12.50,true',
          '2,Widget B Renamed,Widgets,15.99,true',
        ]),
      );

    const commit = importView(page).getByRole('button', { name: /Import$/ });
    await expect(commit).toBeDisabled();
    await importView(page).getByRole('button', { name: 'Validate' }).click();
    await expect(importView(page).getByText(/Validated:/)).toBeVisible();
    await expect(commit).toBeEnabled();

    // Validation writes nothing.
    await importView(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(list(page)).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(5);
    await expect(row(page, 'Imported Gizmo')).toHaveCount(0);

    await openImport(page);
    await importView(page)
      .getByLabel('Import file')
      .setInputFiles(
        csv([
          'id,name,category,price,active',
          ',Imported Gizmo,Other,12.50,true',
          '2,Widget B Renamed,Widgets,15.99,true',
        ]),
      );
    await importView(page).getByRole('button', { name: 'Validate' }).click();
    await expect(commit).toBeEnabled();
    await commit.click();

    await expect(list(page)).toBeVisible();
    await expect(row(page, 'Imported Gizmo')).toHaveCount(1);
    await expect(row(page, 'Widget B Renamed')).toHaveCount(1);
    await expect(page.locator('tbody tr')).toHaveCount(6);
  });

  test('shows row errors from a failed import validation', async ({ page }) => {
    await openImport(page);
    await importView(page)
      .getByLabel('Import file')
      .setInputFiles(
        csv([
          'id,name,category,price,active',
          ',Bad Price,Other,not-a-number,true',
        ]),
      );
    await importView(page).getByRole('button', { name: 'Validate' }).click();
    await expect(
      importView(page).getByText(/\/rows\/\d+\/price/),
    ).toBeVisible();
    await expect(
      importView(page).getByRole('button', { name: /Import$/ }),
    ).toBeDisabled();
  });

  test('both import templates download a CSV', async ({ page }) => {
    await openImport(page);

    const plain = page.waitForEvent('download');
    await importView(page)
      .getByRole('button', { name: /Template$/ })
      .click();
    const plainFile = await plain;
    expect(plainFile.suggestedFilename()).toMatch(/\.csv$/);

    const prefilled = page.waitForEvent('download');
    await importView(page)
      .getByRole('button', { name: 'Template (With Data)' })
      .click();
    const prefilledFile = await prefilled;
    expect(prefilledFile.suggestedFilename()).toMatch(/\.csv$/);
    const path = await prefilledFile.path();
    const body = (await import('node:fs')).readFileSync(path, 'utf8');
    expect(body).toContain('Widget A');
    expect(body).toContain('Doohickey');
  });

  // Export -----------------------------------------------------------------

  test('export downloads a CSV with the seed names', async ({ page }) => {
    const download = page.waitForEvent('download');
    await list(page).getByRole('button', { name: 'Export' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.csv$/);
    const body = (await import('node:fs')).readFileSync(
      await file.path(),
      'utf8',
    );
    expect(body).toContain('Widget A');
    expect(body).toContain('Gadget Y');
  });
});

// ---------------------------------------------------------------------------
// Dashboard sanity
// ---------------------------------------------------------------------------

test.describe('Dashboard page', () => {
  test('root redirects to dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('shows product statistics cards', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Products in Catalog')).toBeVisible();
    await expect(page.getByText('Active Products')).toBeVisible();
    await expect(page.getByText('Categories')).toBeVisible();
  });
});
