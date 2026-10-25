import { expect, test } from '@playwright/test';

// The Tailwind consumer fixture (see tools/scripts/verify-consumer.mjs) is served on 4403.
const fixtureURL = 'http://localhost:4403/';

test.describe('application CSS wins the cascade', () => {
  test('a w-full button fills a 400px container', async ({ page }) => {
    await page.goto(fixtureURL);
    const button = page.locator('[data-test="wfull"]');
    await button.waitFor();
    const width = await button.evaluate((el) => getComputedStyle(el).width);
    expect(width).toBe('400px');
  });

  test('an unlayered :root --rnf-accent override recolours a primary button', async ({
    page,
  }) => {
    await page.goto(fixtureURL);
    const button = page.locator(
      '[data-test="primary"][data-variant="primary"]',
    );
    // The fixture's override.css sets --rnf-accent: #ff00ff before the tokens import.
    await expect(button).toHaveCSS('background-color', 'rgb(255, 0, 255)');
  });
});
