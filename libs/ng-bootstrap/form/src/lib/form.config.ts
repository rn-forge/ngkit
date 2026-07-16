import { makeEnvironmentProviders } from '@angular/core';
import { RN_FORGE_BOOTSTRAP_CONFIG_PARTS } from '@rn-forge/ng-bootstrap';

import type { FormOptions } from './form/form.component';

/**
 * Configuration for form EP components.
 * Keys match each component's `configKey`.
 */
export interface FormConfig {
  form?: Partial<FormOptions>;
  dropdownField?: Partial<Record<string, unknown>>;
  inputField?: Partial<Record<string, unknown>>;
  multiTypeaheadField?: Partial<Record<string, unknown>>;
  richTextField?: Partial<Record<string, unknown>>;
  typeaheadField?: Partial<Record<string, unknown>>;
}

/**
 * Provides configuration for form EP components
 * (form, input-field, dropdown-field, typeahead-field, rich-text-field).
 */
export const provideRnForgeFormConfig = (config: FormConfig) => {
  return makeEnvironmentProviders([
    { provide: RN_FORGE_BOOTSTRAP_CONFIG_PARTS, useValue: config, multi: true },
  ]);
};
