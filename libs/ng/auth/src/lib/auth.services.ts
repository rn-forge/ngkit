// external imports
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, Signal, inject, signal } from '@angular/core';
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
  private readonly currentExpiryWarning = signal(false);
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;
  /** Whether the current session has reached its configured expiry warning lead time. */
  readonly expiryWarning: Signal<boolean> =
    this.currentExpiryWarning.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.expiryTimer));
  }

  private setCredentials(credentials: Credentials): void {
    this.currentCredentials.set(credentials);
    this.recomputeExpiryWarning();
  }

  private recomputeExpiryWarning(): void {
    clearTimeout(this.expiryTimer);
    this.expiryTimer = undefined;
    const session = this.currentCredentials().session;
    const due = session
      ? Date.parse(session.expiresAt) - this.config.expiryLeadMs - Date.now()
      : undefined;
    this.currentExpiryWarning.set(due !== undefined && due <= 0);
    if (due !== undefined && due > 0) {
      this.expiryTimer = setTimeout(
        () => this.recomputeExpiryWarning(),
        Math.min(due, 2_147_483_647),
      );
    }
  }

  /** Set anonymous credentials locally, without calling the backend. */
  clear(): void {
    this.setCredentials(new AnonymousCredentials());
  }

  /** Start a provider login or open the login page for the return path. */
  startLogin(returnTo: string): void {
    const openLoginPage = () =>
      void this.router.navigateByUrl(
        this.router.createUrlTree([this.config.loginPath], {
          queryParams: { returnTo },
        }),
      );
    this.providers().subscribe({
      next: (providers) => {
        const navigating = providers.filter((provider) =>
          ['oidc', 'oauth2', 'development'].includes(provider.kind),
        );
        if (
          navigating.length === 1 &&
          !providers.some((provider) => provider.kind === 'password')
        )
          this.login(navigating[0].id, returnTo);
        else openLoginPage();
      },
      error: openLoginPage,
    });
  }

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
        tap((credentials) => this.setCredentials(credentials)),
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
          this.setCredentials(new AnonymousCredentials());
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
      tap((credentials) => this.setCredentials(credentials)),
    );
  }
}
