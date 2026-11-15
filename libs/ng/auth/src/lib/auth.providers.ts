// external imports
import { withXsrfConfiguration } from '@angular/common/http';
import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';

// internal imports
import {
  AuthConfig,
  DEFAULT_AUTH_CONFIG,
  RNF_AUTH_CONFIG_TOKEN,
  RNF_CREDENTIALS,
  RNF_PERMISSION,
} from './auth.config';
import { AuthService } from './auth.services';
import { AuthErrorPolicy } from './auth.interceptors';
import { Permission } from './auth.types';

class CredentialPermission implements Permission {
  private readonly credentials = inject(RNF_CREDENTIALS);
  hasPermission(key: string): boolean {
    return this.credentials().hasPermission(key);
  }
  hasAnyPermission(...keys: string[]): boolean {
    return this.credentials().hasAnyPermission(...keys);
  }
}

/**
 * Configure the session client and await its startup probe.
 * Angular exposes XSRF configuration as an HttpFeature, accepted only by
 * provideHttpClient. Reading its ɵproviders supplies the root-level name tokens
 * without installing another HttpClient; provider order therefore does not matter.
 * This intentionally deviates from ADR-0001's public-API preference.
 * Startup errors are logged unconditionally, deviating from ADR-0001's debug-only
 * logging so a failed probe is visible while the application still starts.
 */
export function provideRnForgeAuth(
  config: Partial<AuthConfig> = {},
): EnvironmentProviders {
  const merged = { ...DEFAULT_AUTH_CONFIG, ...config };
  const invalid = (field: keyof AuthConfig): never => {
    throw new Error(`[rn-forge.ng.auth] Invalid ${field}`);
  };
  for (const field of [
    'sessionUrl',
    'providersUrl',
    'loginUrl',
    'passwordLoginUrl',
    'logoutUrl',
    'loginPath',
    'errorPath',
    'forbiddenPath',
    'loggedOutPath',
  ] as const) {
    if (!merged[field].startsWith('/')) invalid(field);
  }
  if (
    merged.apiUrls.length === 0 ||
    merged.apiUrls.some((url) => !url.startsWith('/'))
  )
    invalid('apiUrls');
  for (const field of ['loopGuardMs', 'expiryLeadMs'] as const) {
    if (!Number.isFinite(merged[field]) || merged[field] <= 0) invalid(field);
  }
  for (const field of ['xsrfCookieName', 'xsrfHeaderName'] as const) {
    if (merged[field].length === 0) invalid(field);
  }
  const frozen = Object.freeze({
    ...merged,
    apiUrls: Object.freeze([...merged.apiUrls]),
  });
  return makeEnvironmentProviders([
    { provide: RNF_AUTH_CONFIG_TOKEN, useValue: frozen },
    ...withXsrfConfiguration({
      cookieName: frozen.xsrfCookieName,
      headerName: frozen.xsrfHeaderName,
    }).ɵproviders,
    {
      provide: RNF_CREDENTIALS,
      useFactory: () => inject(AuthService).credentials,
    },
    { provide: RNF_PERMISSION, useClass: CredentialPermission },
    provideAppInitializer(() => {
      inject(AuthErrorPolicy);
      return firstValueFrom(
        inject(AuthService)
          .refresh()
          .pipe(
            catchError(() => {
              console.error('[rn-forge.ng.auth] Session bootstrap failed');
              return of(undefined);
            }),
          ),
      );
    }),
  ]);
}
