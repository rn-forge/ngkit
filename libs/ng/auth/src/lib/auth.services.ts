// external imports
import {
  Injectable,
  Signal,
  WritableSignal,
  inject,
  signal,
} from '@angular/core';
import { buildUrl } from 'build-url-ts';
import { flatten, map, union, uniq } from 'lodash-es';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

// internal imports
import {
  GenericType,
  LocalStorageService,
  RouteService,
  isDebugMode,
} from '@rn-forge/ng/core';
import { AbstractHTTPService } from '@rn-forge/ng/http';
import { RNF_AUTH_CONFIG_TOKEN, RnForgeAuthConfig } from './auth.config';
import {
  AnonymousCredentials,
  Credentials,
  JwtCredentials,
  JwtToken,
  LoginResponse,
  UserProfile,
} from './auth.types';

// global constants
const JWT_TOKEN_KEY = '_RN_FORGE_AUTH_TOKEN';

/**
 * Manages JWT-based authentication state.
 *
 * New in this version: `credentials: Signal<Credentials>` exposes reactive auth state
 * for injection via RNF_CREDENTIALS (wired by provideRnForgeAuthConfig).
 *
 * Note: `disableAuth` branching still exists here for backward compat with guards/interceptors
 * that have not yet migrated to the token-based API (Phase 2 removes all AuthService imports
 * from ng-bootstrap; Phase 3+ updates guards/interceptors).
 *
 * Decision 18: disableAuth not fully stripped from AuthService in Phase 1 — guards and
 * interceptors still inject AuthService directly. Full strip happens when those consumers
 * migrate to RNF_CREDENTIALS/RNF_PERMISSION in Phase 2/3.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly routeService: RouteService = inject(RouteService);
  private readonly localStorageService: LocalStorageService =
    inject(LocalStorageService);
  private readonly config: Partial<RnForgeAuthConfig> = inject(
    RNF_AUTH_CONFIG_TOKEN,
  );
  private readonly authDisabled: boolean =
    this.config.frontend?.disableAuth ?? false;

  private readonly _credentials: WritableSignal<Credentials> = signal(
    new AnonymousCredentials(),
  );

  /** Reactive user identity — consumed via RNF_CREDENTIALS token (wired by provideRnForgeAuthConfig) */
  readonly credentials: Signal<Credentials> = this._credentials.asReadonly();

  // PubSubService compatibility — replaces the former extends PubSubService<boolean>
  protected readonly subject: BehaviorSubject<boolean>;

  private _jwtToken?: JwtToken;
  private _userProfile?: UserProfile;
  private _userPermissions?: string[];

  constructor() {
    this.subject = new BehaviorSubject<boolean>(this.initialValue());

    if (this.authDisabled) {
      this.subject.next(true);
      return;
    }

    const storedJwtToken = this.localStorageService.get(JWT_TOKEN_KEY);
    if (storedJwtToken) {
      this.login(storedJwtToken);
    }
  }

  initialValue(): boolean {
    return false;
  }

  get jwtToken(): JwtToken | undefined {
    return this._jwtToken;
  }

  get userProfile(): UserProfile | undefined {
    return this._userProfile;
  }

  get userPermissions(): string[] | undefined {
    return this._userPermissions;
  }

  get bearerToken(): string {
    return this._jwtToken ? `Bearer ${this._jwtToken.token}` : '';
  }

  get isAuthenticated(): boolean {
    if (this.authDisabled) {
      return true;
    }

    if (this.subject.value) {
      if (this._jwtToken?.isValid) {
        return true;
      }
      this.logout();
    }

    return false;
  }

  hasPermission(permission: string): boolean {
    return this.hasAnyPermission(permission);
  }

  hasAnyPermission(...permissions: string[]): boolean {
    if (this.authDisabled) {
      return true;
    }

    if (!this.isAuthenticated) {
      return false;
    }

    return (
      this._userPermissions?.some((permission) =>
        permissions.includes(permission),
      ) || false
    );
  }

  sendToLogin(currentUrl?: string): void {
    currentUrl ??= window.location.pathname;
    if (isDebugMode()) console.log('AuthService.sendToLogin:', currentUrl);
    const loginUrl = buildUrl(this.config.frontend?.loginPath, {
      queryParams: { returnUrl: currentUrl },
    });
    this.routeService.navigateByUrl(loginUrl);
  }

  login(accessToken: string): JwtToken | undefined {
    if (isDebugMode()) console.debug('AuthService.login.start');
    const jwtToken = new JwtToken(accessToken);
    if (!jwtToken.isValid) {
      this.logout();
      return undefined;
    }

    if (isDebugMode()) console.debug('AuthService.login.jwtToken', jwtToken);

    this.localStorageService.set(JWT_TOKEN_KEY, jwtToken.token);
    this._jwtToken = jwtToken;
    this._userProfile = jwtToken.getAttribute<UserProfile>('profile');
    this._userPermissions = uniq(
      union(
        this._userProfile?.permissions ?? [],
        flatten(map(this._userProfile?.groups, 'permissions')),
      ),
    );

    // Update signal-based credentials
    this._credentials.set(new JwtCredentials(jwtToken));

    this.subject.next(true);
    return jwtToken;
  }

  logout(): void {
    if (isDebugMode()) console.debug('AuthService.logout');
    this._jwtToken = undefined;
    this._userProfile = undefined;
    this._userPermissions = undefined;
    this.localStorageService.remove(JWT_TOKEN_KEY);

    // Reset signal-based credentials
    this._credentials.set(new AnonymousCredentials());

    this.subject.next(false);
  }

  subscribe(callback: (value: boolean) => void): Subscription {
    return this.subject.subscribe((changedValue) => {
      callback(changedValue);
    });
  }
}

/**
 * Interacts with the backend authentication API.
 * Used by AuthComponent for login/logout HTTP operations.
 */
@Injectable({ providedIn: 'root' })
export class AuthBackendService extends AbstractHTTPService {
  protected authConfig: Partial<RnForgeAuthConfig> = inject(
    RNF_AUTH_CONFIG_TOKEN,
  );

  constructor() {
    super('auth');
  }

  login(user: string, options?: GenericType): Observable<LoginResponse> {
    return this.POST<LoginResponse>(
      'login',
      this.authConfig.backend?.loginPath ?? '',
      { user: user },
      options,
    );
  }

  logout(options?: GenericType): Observable<string> {
    return this.POST<string>(
      'logout',
      this.authConfig.backend?.logoutPath ?? '',
      {},
      options,
    );
  }
}
