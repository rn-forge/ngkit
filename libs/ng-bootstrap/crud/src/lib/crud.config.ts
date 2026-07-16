import { makeEnvironmentProviders } from '@angular/core';
import { RN_FORGE_BOOTSTRAP_CONFIG_PARTS } from '@rn-forge/ng-bootstrap';

import type { CRUDOptions } from './crud/crud.types';

/**
 * Configuration for the crud EP component.
 * Keys match each component's `configKey`.
 */
export interface CrudConfig {
  crud?: Partial<CRUDOptions>;
}

/**
 * Provides configuration for the CRUD EP component.
 */
export const provideRnForgeCrudConfig = (config: CrudConfig) => {
  return makeEnvironmentProviders([
    { provide: RN_FORGE_BOOTSTRAP_CONFIG_PARTS, useValue: config, multi: true },
  ]);
};
