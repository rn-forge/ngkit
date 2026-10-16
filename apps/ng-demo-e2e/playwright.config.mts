import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

/**
 * The fixture backend, chosen by `NG_DEMO_BACKEND`: `django` (the default) or
 * `fastapi`. Both serve the same routes on port 8100, so the suite and the
 * demo's proxy are the same for either. `uv` is run directly, not through
 * `nx run <project>:serve`: under Nx the server survives Playwright's
 * shutdown and keeps port 8100.
 */
const backends: Record<string, string> = {
  django:
    'uv run --project apps/ng-demo-api python apps/ng-demo-api/manage.py serve_fixture localhost:8100',
  fastapi:
    'uv run --project apps/ng-demo-api-fastapi python apps/ng-demo-api-fastapi/serve.py localhost:8100',
};
const backend = process.env['NG_DEMO_BACKEND'] || 'django';
if (!Object.hasOwn(backends, backend)) {
  throw new Error(
    `NG_DEMO_BACKEND must be one of ${Object.keys(backends).join(', ')}; got "${backend}".`,
  );
}

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import 'dotenv/config';

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Generated as a .mts file so Node forces ESM regardless of workspace
 * `type`. Playwright routes `.mts` through its ESM loader (dynamic import,
 * bypassing the pirates CJS-compile path), and Nx's native TS strip loads
 * `.mts` directly. Playwright's configLoader auto-discovers
 * `playwright.config.mts` via its extension list
 * (.ts/.js/.mts/.mjs/.cts/.cjs).
 */
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* The fixture's database is shared, so tests run one at a time. */
  workers: 1,
  fullyParallel: false,
  /* The fixture backend, then the demo built for it (dev-server compile is slow). */
  webServer: [
    {
      command: backends[backend],
      url: 'http://localhost:8100/api/products',
      reuseExistingServer: !process.env['CI'],
      cwd: workspaceRoot,
      timeout: 180_000,
    },
    {
      command: 'pnpm exec nx run ng-demo:serve:fixture',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      cwd: workspaceRoot,
      timeout: 180_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Uncomment for mobile browsers support
    /* {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    }, */

    // Uncomment for branded browsers
    /* {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    } */
  ],
});
