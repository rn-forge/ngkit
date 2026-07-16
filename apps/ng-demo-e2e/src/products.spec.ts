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
      listView.getByRole('button', { name: 'Upload' }),
    ).toBeVisible();
    await expect(
      listView.getByRole('button', { name: 'Download' }),
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
      page.getByText('Deleted 1 record(s) successfully'),
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Upload
  // -------------------------------------------------------------------------

  test('navigates to upload view and back via cancel', async ({ page }) => {
    await page
      .locator('[aria-label="List View"]')
      .getByRole('button', { name: 'Upload' })
      .click();

    const uploadView = page.locator('[aria-label="Upload View"]');
    await expect(uploadView).toBeVisible();
    // List view is hidden while in upload mode
    await expect(page.locator('[aria-label="List View"]')).toBeHidden();

    await uploadView.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('[aria-label="List View"]')).toBeVisible();
  });

  test('shows template download buttons in upload view', async ({ page }) => {
    await page
      .locator('[aria-label="List View"]')
      .getByRole('button', { name: 'Upload' })
      .click();

    const uploadView = page.locator('[aria-label="Upload View"]');
    // Two template buttons: "Template" and "Template (With Data)"
    await expect(
      uploadView.getByRole('button', { name: /Template/i }),
    ).toHaveCount(2);
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
