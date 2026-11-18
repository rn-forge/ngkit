// external imports
import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpXsrfTokenExtractor,
} from '@angular/common/http';
import { Injectable, inject, linkedSignal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  share,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

// internal imports
import { RNF_AUTH_CONFIG_TOKEN } from './auth.config';
import { AuthService } from './auth.services';
import { Credentials } from './auth.types';

/** Internal session policy using Angular state and RxJS error handling. */
@Injectable({ providedIn: 'root' })
export class AuthErrorPolicy {
  private readonly auth = inject(AuthService);
  private readonly config = inject(RNF_AUTH_CONFIG_TOKEN);
  private readonly router = inject(Router);
  private readonly xsrf = inject(HttpXsrfTokenExtractor);
  private readonly loginPending = linkedSignal<Credentials, boolean>({
    source: this.auth.credentials,
    computation: (credentials, previous) =>
      credentials.isAuthenticated ? false : (previous?.value ?? false),
  });
  private forbiddenRefresh: Observable<Credentials> | undefined;

  handles(url: string): boolean {
    const path = url.split('?')[0];
    return (
      path.startsWith('/') &&
      !path.startsWith('//') &&
      ![
        this.config.sessionUrl,
        this.config.providersUrl,
        this.config.passwordLoginUrl,
        this.config.logoutUrl,
      ].includes(path) &&
      this.config.apiUrls.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      )
    );
  }

  handle(error: unknown, request: HttpRequest<unknown>, next: HttpHandlerFn) {
    if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
    if (error.status === 401) {
      if (this.loginPending()) return throwError(() => error);
      this.auth.clear();
      this.loginPending.set(true);
      this.auth.startLogin(this.router.url);
    } else if (error.status === 403) {
      if (
        typeof error.error?.type === 'string' &&
        error.error.type.endsWith('csrf-failed')
      ) {
        return this.auth.refresh().pipe(
          catchError(() => throwError(() => error)),
          switchMap(() => {
            const token = this.xsrf.getToken();
            const retry =
              !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
              token !== null
                ? request.clone({
                    setHeaders: { [this.config.xsrfHeaderName]: token },
                  })
                : request;
            return next(retry);
          }),
        );
      }
      this.forbiddenRefresh ??= this.auth.refresh().pipe(
        tap(() => void this.router.navigateByUrl(this.config.forbiddenPath)),
        finalize(() => (this.forbiddenRefresh = undefined)),
        share(),
      );
      return this.forbiddenRefresh.pipe(
        catchError(() => throwError(() => error)),
        switchMap(() => throwError(() => error)),
      );
    }
    return throwError(() => error);
  }
}

/** Apply the session error policy to configured same-origin API requests. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const policy = inject(AuthErrorPolicy);
  if (!policy.handles(request.url)) return next(request);
  return next(request).pipe(
    catchError((error: unknown) => policy.handle(error, request, next)),
  );
};
