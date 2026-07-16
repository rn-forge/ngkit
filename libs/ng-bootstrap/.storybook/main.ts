// This file has been automatically migrated to valid ESM format by Storybook.
import type { StorybookConfig } from '@storybook/angular';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceRoot = path.resolve(__dirname, '../../..');

const config: StorybookConfig = {
  stories: ['../**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],
  addons: [],
  framework: {
    name: getAbsolutePath('@storybook/angular'),
    options: {},
  },
  webpackFinal: async (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@rn-forge/ng-bootstrap/assets': path.resolve(
        workspaceRoot,
        'libs/ng-bootstrap/assets/src/index.ts',
      ),
      '@rn-forge/ng-bootstrap': path.resolve(
        workspaceRoot,
        'libs/ng-bootstrap/src/index.ts',
      ),
      '@rn-forge/ng-bootstrap/auth': path.resolve(
        workspaceRoot,
        'libs/ng-bootstrap/auth/src/index.ts',
      ),
      '@rn-forge/ng-bootstrap/crud': path.resolve(
        workspaceRoot,
        'libs/ng-bootstrap/crud/src/index.ts',
      ),
      '@rn-forge/ng-bootstrap/form': path.resolve(
        workspaceRoot,
        'libs/ng-bootstrap/form/src/index.ts',
      ),
      '@rn-forge/ng-bootstrap/shell': path.resolve(
        workspaceRoot,
        'libs/ng-bootstrap/shell/src/index.ts',
      ),
    };
    return config;
  },
  staticDirs: [
    {
      from: path.resolve(__dirname, '../../../node_modules/jquery/dist'),
      to: '/sb-vendor',
    },
    {
      from: path.resolve(__dirname, '../../../node_modules/bootstrap/dist/js'),
      to: '/sb-vendor',
    },
    {
      from: path.resolve(__dirname, '../../../node_modules/jquery-treegrid/js'),
      to: '/sb-vendor',
    },
    {
      from: path.resolve(
        __dirname,
        '../../../node_modules/bootstrap-table/dist',
      ),
      to: '/sb-vendor/bootstrap-table',
    },
  ],
};

export default config;

// To customize your webpack configuration you can use the webpackFinal field.
// Check https://storybook.js.org/docs/react/builders/webpack#extending-storybooks-webpack-config
// and https://nx.dev/recipes/storybook/custom-builder-configs

function getAbsolutePath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
