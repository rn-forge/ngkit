import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const floorPort = 4404;
const currentPort = 4405;
const bootstrapVersion = JSON.parse(
  readFileSync(join(workspaceRoot, 'libs/ng-bootstrap/package.json'), 'utf-8'),
).version;

const fixtureServer = (target: string, cell: string, port: number) => ({
  // Builds the Bootstrap consumer fixture (npm install + ng build, minutes on a cold cache) and serves its output.
  command: `pnpm exec nx run ${target} && node apps/ng-tailwind-e2e/serve.mjs`,
  env: {
    PORT: String(port),
    ROOT: `dist/consumer-fixtures/rn-forge-ng-bootstrap-${bootstrapVersion}/${cell}/out/browser`,
    SPA: '1',
  },
  url: `http://localhost:${port}`,
  reuseExistingServer: !process.env['CI'],
  cwd: workspaceRoot,
  timeout: 600_000,
});

/**
 * Browser checks over applications built from the packed `ng-bootstrap` and `ng` tarballs
 * (see tools/consumer/ng-bootstrap-app.mjs): the Angular floor in zone mode (22.0-zone) and
 * the current tested version in zoneless mode (22.1-zoneless).
 */
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  use: {
    trace: 'on-first-retry',
  },
  webServer: [
    fixtureServer(
      'ng-bootstrap:consumer-fixture:floor',
      '22.0-zone',
      floorPort,
    ),
    fixtureServer(
      'ng-bootstrap:consumer-fixture',
      '22.1-zoneless',
      currentPort,
    ),
  ],
  projects: [
    {
      name: 'floor-zone',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${floorPort}`,
      },
    },
    {
      name: 'current-zoneless',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${currentPort}`,
      },
    },
  ],
});
