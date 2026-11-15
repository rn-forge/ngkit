// external imports
import { makeEnvironmentProviders } from '@angular/core';

// internal imports
import {
  ConfigOptions,
  RN_FORGE_BOOTSTRAP_CONFIG_PARTS,
} from '@rn-forge/ng-bootstrap';

import type { UserOptions } from './user/user.component';

/**
 * Configuration for the login page and user components.
 * Keys match each component's `configKey`.
 *
 * Note: `user.profile` and `user.settings` sub-options are nested
 * within the `user` key to match the `user.profile` / `user.settings`
 * configKey paths used by those sub-components.
 */
export interface AuthUiConfig {
  login?: Partial<ConfigOptions>;
  user?: Partial<UserOptions>;
}

/**
 * Provides configuration for the login page and user menu.
 * This is distinct from `provideRnForgeAuth` in `@rn-forge/ng/auth`,
 * which configures the authentication service.
 */
export const provideRnForgeAuthUiConfig = (config: AuthUiConfig) => {
  return makeEnvironmentProviders([
    { provide: RN_FORGE_BOOTSTRAP_CONFIG_PARTS, useValue: config, multi: true },
  ]);
};
