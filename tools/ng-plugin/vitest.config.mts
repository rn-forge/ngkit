import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: import.meta.dirname,
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: '../../coverage/ng-plugin',
      thresholds: { statements: 35, branches: 35, functions: 35, lines: 35 },
    },
  },
});
