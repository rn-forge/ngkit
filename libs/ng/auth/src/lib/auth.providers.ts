// external imports
import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  signal,
} from '@angular/core';
import { merge } from 'lodash-es';

// internal imports
import {
  DEFAULT_RN_FORGE_AUTH_CONFIG,
  RNF_AUTH_CONFIG_TOKEN,
  RNF_CREDENTIALS,
  RNF_PERMISSION,
  RnForgeAuthConfig,
} from './auth.config';
import { AuthService } from './auth.services';
import {
  AllowAnyPermission,
  AnonymousCredentials,
  Credentials,
  Permission,
} from './auth.types';

// ---------------------------------------------------------------------------
// CredentialPermission — internal class, not exported
// Delegates permission checks to the current Signal<Credentials>
// ---------------------------------------------------------------------------

class CredentialPermission implements Permission {
  private readonly credentials = inject(RNF_CREDENTIALS);

  hasPermission(key: string): boolean {
    return this.credentials().hasPermission(key);
  }

  hasAnyPermission(...keys: string[]): boolean {
    return this.credentials().hasAnyPermission(...keys);
  }
}

// ---------------------------------------------------------------------------
// provideRnForgeAuthConfig — single wiring point for auth DI
// ---------------------------------------------------------------------------

export function provideRnForgeAuthConfig(
  config: RnForgeAuthConfig,
): EnvironmentProviders {
  const merged = merge({}, DEFAULT_RN_FORGE_AUTH_CONFIG, config);
  const disabled = merged.frontend?.disableAuth;

  return makeEnvironmentProviders([
    { provide: RNF_AUTH_CONFIG_TOKEN, useValue: merged },
    disabled
      ? { provide: RNF_PERMISSION, useClass: AllowAnyPermission }
      : {
          provide: RNF_PERMISSION,
          useClass: CredentialPermission,
          deps: [RNF_CREDENTIALS],
        },
    disabled
      ? {
          provide: RNF_CREDENTIALS,
          useFactory: (): ReturnType<typeof signal<Credentials>> =>
            signal(new AnonymousCredentials()),
        }
      : {
          provide: RNF_CREDENTIALS,
          useFactory: (auth: AuthService) => auth.credentials,
          deps: [AuthService],
        },
  ]);
}
