import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

const port = 4402;
const baseURL = process.env['BASE_URL'] || `http://localhost:${port}`;
const fixturePort = 4403;

/**
 * Browser checks over the built `ng-tailwind` Storybook (`dist/storybook/ng-tailwind`),
 * which the web server command builds first. The tests open `iframe.html?id=<story>`.
 */
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: [
    {
      // Built here, not by dependsOn, so each atomized e2e-ci task has it on a distributed agent.
      command: `pnpm exec nx run ng-tailwind:build-storybook && node apps/ng-tailwind-e2e/serve.mjs`,
      env: { PORT: String(port) },
      url: `${baseURL}/iframe.html`,
      reuseExistingServer: !process.env['CI'],
      cwd: workspaceRoot,
      timeout: 180_000,
    },
    {
      // Builds the Tailwind consumer fixture (npm install + ng build, minutes on a cold cache) and serves its output.
      command: `pnpm exec nx run ng-tailwind:consumer-fixture && node apps/ng-tailwind-e2e/serve.mjs`,
      env: {
        PORT: String(fixturePort),
        ROOT: 'dist/consumer-fixtures/ng-tailwind-tailwind-angular-22.1-zoneless/out/browser',
        SPA: '1',
      },
      url: `http://localhost:${fixturePort}`,
      reuseExistingServer: !process.env['CI'],
      cwd: workspaceRoot,
      timeout: 600_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
