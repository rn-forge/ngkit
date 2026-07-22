// external imports
import {
  inject,
  InjectionToken,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { merge } from 'lodash-es';

// internal imports — root EP types only
import type { AlertOptions } from './alert/alert.types';
import type { ButtonOptions } from './button/button.types';
import type { ErrorOptions } from './error/error.types';
import type { ModalOptions } from './modal/modal.types';
import type { TableOptions } from './table/table.types';
import { loadBootstrap } from './bootstrap-loader';
import { loadBootstrapTable } from './table/bootstrap-table-loader';
import { loadTreegrid } from './table/treegrid-loader';

/**
 * Configuration interface for root EP components only.
 * Secondary EPs (shell, auth, crud, form) each provide their own config
 * via their own `provide*Config()` functions.
 */
export interface RnForgeBootstrapConfig {
  /** Base path for theme CSS files. Default: 'assets/styles/themes'. */
  themePath?: string;
  alert?: Partial<AlertOptions>;
  button?: Partial<ButtonOptions>;
  error?: Partial<ErrorOptions>;
  modal?: Partial<ModalOptions>;
  table?: Partial<TableOptions>;
}

/**
 * Multi-token that collects config slices from all EPs.
 * Each `provide*Config()` function contributes one slice via `multi: true`.
 * The unified token's factory merges all slices into a single config object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const RN_FORGE_BOOTSTRAP_CONFIG_PARTS = new InjectionToken<any>(
  'RnForgeBootstrapConfigParts',
);

/**
 * Unified config token consumed by `ConfigurerService` and `StyleHelper`.
 * Built by merging all registered config parts at injection time.
 */
export const RN_FORGE_BOOTSTRAP_CONFIG_TOKEN = new InjectionToken<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<string, any>
>('RnForgeBootstrapConfig', {
  providedIn: 'root',
  factory: () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const parts =
      (inject(RN_FORGE_BOOTSTRAP_CONFIG_PARTS, {
        optional: true,
      }) as any[] | null) ?? [];
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return merge({}, ...parts);
  },
});

/**
 * Provides configuration for root EP components (alert, button, error, modal, table).
 * Call alongside per-EP providers for secondary EPs:
 *
 * ```ts
 * provideRnForgeBootstrapConfig({ table: { minWidth: 700 } }),
 * provideRnForgeShellConfig({ header: { navbarColor: 'primary' } }),
 * ```
 */
export const provideRnForgeBootstrapConfig = (
  config: RnForgeBootstrapConfig,
) => {
  return makeEnvironmentProviders([
    { provide: RN_FORGE_BOOTSTRAP_CONFIG_PARTS, useValue: config, multi: true },
    // Single initializer loading all vendor scripts sequentially — apps get the
    // full script setup from this provider alone (no scripts/polyfills entry in
    // the app build config). Order matters: jQuery/bootstrap-table globals must
    // exist before treegrid, and ng-bootstrap-scripts may patch any of them.
    provideAppInitializer(async () => {
      await loadBootstrap();
      await loadBootstrapTable();
      if (config.table?.treegrid) {
        await loadTreegrid();
      }
      await import('./ng-bootstrap-scripts');
    }),
  ]);
};
