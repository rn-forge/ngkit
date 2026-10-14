import { expect, test } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function gotoProducts(page: import('@playwright/test').Page) {
  await page.goto('/products');
  await page.locator('[aria-label="List View"]').waitFor();
  // Wait for at least one data row (ajax load completes)
  await page.locator('tbody tr').first().waitFor({ timeout: 5000 });
}

// ---------------------------------------------------------------------------
// Products CRUD e2e
// ---------------------------------------------------------------------------

test.describe('Products page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoProducts(page);
  });

  // -------------------------------------------------------------------------
  // List
  // -------------------------------------------------------------------------

  test('loads seed products in the table', async ({ page }) => {
    const listView = page.locator('[aria-label="List View"]');
    await expect(listView).toBeVisible();
    await expect(listView.getByText('Widget A')).toBeVisible();
    await expect(listView.getByText('Widget B')).toBeVisible();
    await expect(listView.getByText('Gadget X')).toBeVisible();
  });

  test('shows the correct toolbar buttons', async ({ page }) => {
    const listView = page.locator('[aria-label="List View"]');
    await expect(listView.getByRole('button', { name: 'Add' })).toBeVisible();
    await expect(
      listView.getByRole('button', { name: 'Update' }),
    ).toBeVisible();
    await expect(
      listView.getByRole('button', { name: 'Delete' }),
    ).toBeVisible();
    await expect(
      listView.getByRole('button', { name: 'Import' }),
    ).toBeVisible();
    await expect(
      listView.getByRole('button', { name: 'Export' }),
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Add
  // -------------------------------------------------------------------------

  test('adds a new product via the add form', async ({ page }) => {
    const listView = page.locator('[aria-label="List View"]');
    await listView.getByRole('button', { name: 'Add' }).click();

    const addView = page.locator('[aria-label="Add/Update View"]');
    await expect(addView).toBeVisible();

    await addView.getByLabel('Name').fill('Test Widget');
    await addView.getByLabel('Category').selectOption('Widgets');
    await addView.getByLabel('Price').fill('24.99');
    await addView.getByLabel('Active').selectOption('true');

    await addView.getByRole('button', { name: 'Submit' }).click();

    await expect(page.locator('[aria-label="List View"]')).toBeVisible();
    await expect(page.getByText('Added Product successfully')).toBeVisible();
  });

  test('cancel add returns to list view', async ({ page }) => {
    await page
      .locator('[aria-label="List View"]')
      .getByRole('button', { name: 'Add' })
      .click();
    const addView = page.locator('[aria-label="Add/Update View"]');
    await expect(addView).toBeVisible();

    await addView.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('[aria-label="List View"]')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  test('updates a product via the update form', async ({ page }) => {
    // Select the first row via its checkbox
    await page
      .locator('tbody tr')
      .first()
      .locator('input[type="checkbox"]')
      .check();

    await page
      .locator('[aria-label="List View"]')
      .getByRole('button', { name: 'Update' })
      .click();

    const addView = page.locator('[aria-label="Add/Update View"]');
    await expect(addView).toBeVisible();

    await addView.getByLabel('Name').fill('Updated Widget');

    await addView.getByRole('button', { name: 'Submit' }).click();

    await expect(page.locator('[aria-label="List View"]')).toBeVisible();
    await expect(page.getByText('Updated Product successfully')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  test('deletes a selected product after modal confirmation', async ({
    page,
  }) => {
    await page
      .locator('tbody tr')
      .first()
      .locator('input[type="checkbox"]')
      .check();

    await page
      .locator('[aria-label="List View"]')
      .getByRole('button', { name: 'Delete' })
      .click();

    const modal = page.locator('.modal.show');
    await expect(modal).toBeVisible();
    await expect(
      modal.getByText('Are you sure you want to delete'),
    ).toBeVisible();

    await modal.getByRole('button', { name: 'Delete' }).click();

    await expect(page.locator('.modal.show')).toBeHidden();
    await expect(
      page.getByText('Deleted 1 Product successfully'),
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Import
  // -------------------------------------------------------------------------

  test('navigates to import view and back via cancel', async ({ page }) => {
    await page
      .locator('[aria-label="List View"]')
      .getByRole('button', { name: 'Import' })
      .click();

    const importView = page.locator('[aria-label="Import View"]');
    await expect(importView).toBeVisible();
    // List view is hidden while in import mode
    await expect(page.locator('[aria-label="List View"]')).toBeHidden();

    await importView.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('[aria-label="List View"]')).toBeVisible();
  });

  test('shows template download buttons in import view', async ({ page }) => {
    await page
      .locator('[aria-label="List View"]')
      .getByRole('button', { name: 'Import' })
      .click();

    const importView = page.locator('[aria-label="Import View"]');
    // Two template buttons: "Template" and "Template (With Data)"
    await expect(
      importView.getByRole('button', { name: /Template/i }),
    ).toHaveCount(2);
  });

  // -------------------------------------------------------------------------
  // Sort, filter, paging
  // -------------------------------------------------------------------------

  test('sorting a column shows the server order', async ({ page }) => {
    const firstName = () =>
      page.locator('tbody tr').first().locator('td').nth(2);
    await expect(firstName()).toHaveText('Widget A');

    // The demo's mock API sorts server-side, so the order below is its answer.
    const header = page.locator('th', { hasText: 'Name' }).first();
    await header.click(); // ascending
    await header.click(); // descending
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

  // -------------------------------------------------------------------------
  // Two-step import
  // -------------------------------------------------------------------------

  test('imports in two steps: validate, then commit', async ({ page }) => {
    await page
      .locator('[aria-label="List View"]')
      .getByRole('button', { name: 'Import' })
      .click();
    const importView = page.locator('[aria-label="Import View"]');
    await importView.getByLabel('Import file').setInputFiles({
      name: 'rows.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('id,name\n'),
    });

    const commit = importView.getByRole('button', { name: /Import$/ });
    await expect(commit).toBeDisabled();
    await importView.getByRole('button', { name: 'Validate' }).click();
    await expect(importView.getByText(/Validated:/)).toBeVisible();
    await expect(commit).toBeEnabled();

    await commit.click();
    await expect(page.getByText(/imported \[Added 2/)).toBeVisible();
    await expect(page.locator('[aria-label="List View"]')).toBeVisible();
  });

  test('shows row errors from a failed import validation', async ({ page }) => {
    await page
      .locator('[aria-label="List View"]')
      .getByRole('button', { name: 'Import' })
      .click();
    const importView = page.locator('[aria-label="Import View"]');
    await importView.getByLabel('Import file').setInputFiles({
      name: 'bad.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('id,name\n'),
    });
    await importView.getByRole('button', { name: 'Validate' }).click();
    await expect(
      importView.getByText('/rows/2/price: price must be a number'),
    ).toBeVisible();
    await expect(
      importView.getByRole('button', { name: /Import$/ }),
    ).toBeDisabled();
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
