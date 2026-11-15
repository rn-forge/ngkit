// external imports
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  ignoreElements,
  map,
  of,
  tap,
  throwError,
} from 'rxjs';

// internal imports
import { RNF_AUTH_CONFIG_TOKEN } from './auth.config';
import { FullPageNavigation } from './auth.navigation';
import {
  AnonymousCredentials,
  AuthProvider,
  Credentials,
  PasswordLoginError,
  Session,
  SessionCredentials,
} from './auth.types';

/** Fetches the backend session and exposes the current reactive credentials. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(RNF_AUTH_CONFIG_TOKEN);
  private readonly navigation = inject(FullPageNavigation);
  private readonly router = inject(Router);
  private readonly currentCredentials = signal<Credentials>(
    new AnonymousCredentials(),
  );
  /** Readonly reactive identity, initially anonymous. */
  readonly credentials: Signal<Credentials> =
    this.currentCredentials.asReadonly();

  /** Start a full-page provider login with a relative application return path. */
  login(provider: string, returnTo: string): void {
    if (
      !returnTo.startsWith('/') ||
      returnTo[1] === '/' ||
      returnTo[1] === '\\'
    ) {
      throw new Error(
        '[rn-forge.ng.auth] returnTo must be a relative path within the application',
      );
    }
    sessionStorage.setItem('rnf.auth.loginStartedAt', String(Date.now()));
    this.navigation.assign(
      `${this.config.loginUrl}/${encodeURIComponent(provider)}?return_to=${encodeURIComponent(returnTo)}`,
    );
  }

  /** Sign in locally, mapping expected password failures for the login form. */
  loginWithPassword(
    username: string,
    password: string,
  ): Observable<Credentials> {
    return this.http
      .post<Session>(this.config.passwordLoginUrl, { username, password })
      .pipe(
        map((session): Credentials => new SessionCredentials(session)),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401)
            return throwError(
              () => new PasswordLoginError('invalid-credentials'),
            );
          if (error.status === 429)
            return throwError(() => new PasswordLoginError('rate-limited'));
          return throwError(() => error);
        }),
        tap((credentials) => this.currentCredentials.set(credentials)),
      );
  }

  /** List supported providers, always warning about unknown kinds to expose contract drift. */
  providers(): Observable<readonly AuthProvider[]> {
    return this.http
      .get<readonly AuthProvider[]>(this.config.providersUrl)
      .pipe(
        map((providers) =>
          providers.filter((provider) => {
            if (
              ['oidc', 'oauth2', 'development', 'password'].includes(
                provider.kind,
              )
            )
              return true;
            console.warn(
              `[rn-forge.ng.auth] unknown provider kind ${provider.kind}`,
            );
            return false;
          }),
        ),
      );
  }

  /** End the session and navigate away, completing without a value. */
  logout(): Observable<void> {
    return this.http
      .post<{ redirect: string | null }>(this.config.logoutUrl, {})
      .pipe(
        catchError((error: HttpErrorResponse) =>
          error.status === 401
            ? of({ redirect: null })
            : throwError(() => error),
        ),
        tap(({ redirect }) => {
          this.currentCredentials.set(new AnonymousCredentials());
          if (typeof redirect === 'string') this.navigation.assign(redirect);
          else void this.router.navigateByUrl(this.config.loggedOutPath);
        }),
        ignoreElements(),
      );
  }

  /** Fetch and emit credentials; a 401 becomes anonymous, while other errors pass through. */
  refresh(): Observable<Credentials> {
    return this.http.get<Session>(this.config.sessionUrl).pipe(
      map((session): Credentials => new SessionCredentials(session)),
      catchError((error: HttpErrorResponse) =>
        error.status === 401
          ? of(new AnonymousCredentials())
          : throwError(() => error),
      ),
      tap((credentials) => this.currentCredentials.set(credentials)),
    );
  }
}
