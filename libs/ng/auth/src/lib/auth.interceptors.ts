// external imports
import {
  HttpEvent,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { tap, throwError } from 'rxjs';

// internal imports
import { isDebugMode } from '@rn-forge/ng/core';
import {
  AuthBackendConfig,
  RNF_AUTH_CONFIG_TOKEN,
  RNF_CREDENTIALS,
} from './auth.config';
import { AuthService } from './auth.services';

export function authHttpInterceptor(): HttpInterceptorFn {
  return (req, next) => {
    const config: AuthBackendConfig | undefined = inject(
      RNF_AUTH_CONFIG_TOKEN,
    ).backend;
    const credentials = inject(RNF_CREDENTIALS);
    // AuthService still injected for bearerToken and sendToLogin — will be migrated in Phase 3
    const authService = inject(AuthService);

    for (const pattern of config?.ignoreBackendURLs ?? []) {
      if (req.url.includes(pattern)) {
        if (isDebugMode()) {
          console.debug(
            'rn-forge.ng.auth.interceptor: ignoring URL | %s',
            req.url,
          );
        }
        return next(req);
      }
    }

    if (!credentials().isAuthenticated) {
      if (isDebugMode()) {
        console.warn(
          'rn-forge.ng.auth.interceptor: not authenticated, redirecting | %s',
          req.url,
        );
      }
      authService.sendToLogin();
      return throwError(() => new Error('Unauthenticated'));
    }

    if (isDebugMode()) {
      console.debug(
        'rn-forge.ng.auth.interceptor: adding auth token | %s',
        req.url,
      );
    }
    req = req.clone({
      setHeaders: { Authorization: authService.bearerToken },
    });

    return next(req).pipe(
      tap((event: HttpEvent<unknown>) => {
        if (
          event instanceof HttpResponse &&
          [401, 403].includes(event.status)
        ) {
          console.error(
            'rn-forge.ng.auth.interceptor: auth error in response',
            event,
          );
          authService.sendToLogin();
        }
      }),
    );
  };
}
