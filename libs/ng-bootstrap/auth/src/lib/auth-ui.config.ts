import { makeEnvironmentProviders } from '@angular/core';
import { RN_FORGE_BOOTSTRAP_CONFIG_PARTS } from '@rn-forge/ng-bootstrap';

import type { AuthOptions } from './auth/auth.component';
import type { UserOptions } from './user/user.component';

/**
 * Configuration for auth EP UI components.
 * Keys match each component's `configKey`.
 *
 * Note: `user.profile` and `user.settings` sub-options are nested
 * within the `user` key to match the `user.profile` / `user.settings`
 * configKey paths used by those sub-components.
 */
export interface AuthUiConfig {
  auth?: Partial<AuthOptions>;
  user?: Partial<UserOptions>;
}

/**
 * Provides configuration for auth EP UI components (auth form, user menu).
 * This is distinct from `provideRnForgeAuthConfig` in `@rn-forge/ng/auth`,
 * which configures the authentication service.
 */
export const provideRnForgeAuthUiConfig = (config: AuthUiConfig) => {
  return makeEnvironmentProviders([
    { provide: RN_FORGE_BOOTSTRAP_CONFIG_PARTS, useValue: config, multi: true },
  ]);
};
