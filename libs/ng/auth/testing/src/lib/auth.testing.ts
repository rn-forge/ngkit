// external imports
import {
  EnvironmentProviders,
  Signal,
  inject,
  makeEnvironmentProviders,
  signal,
} from '@angular/core';
import { EMPTY, Observable, of } from 'rxjs';

// internal imports
import {
  AnonymousCredentials,
  AuthProvider,
  AuthService,
  Credentials,
  DEFAULT_AUTH_CONFIG,
  Permission,
  RNF_AUTH_CONFIG_TOKEN,
  RNF_CREDENTIALS,
  RNF_PERMISSION,
  Session,
  SessionCredentials,
} from '@rn-forge/ng/auth';

/** Controllable session stand-in for unit tests and stories, without network or navigation. */
export class FakeAuthService {
  static readonly marker = 'rn-forge.ng.auth.testing';

  private readonly currentCredentials = signal<Credentials>(
    new AnonymousCredentials(),
  );
  private readonly warning = signal(false);
  private availableProviders: readonly AuthProvider[] = [];

  readonly credentials: Signal<Credentials> =
    this.currentCredentials.asReadonly();
  readonly expiryWarning: Signal<boolean> = this.warning.asReadonly();
  /** Calls recorded by login() for assertions. */
  readonly logins: { provider: string; returnTo: string }[] = [];

  setSession(session: Session | null): void {
    this.currentCredentials.set(
      session === null
        ? new AnonymousCredentials()
        : new SessionCredentials(session),
    );
  }

  setExpiryWarning(value: boolean): void {
    this.warning.set(value);
  }

  setProviders(providers: readonly AuthProvider[]): void {
    this.availableProviders = providers;
  }

  login(provider: string, returnTo: string): void {
    this.logins.push({ provider, returnTo });
  }

  startLogin(_returnTo: string): void {
    // Tests start no login; spy on this method to assert calls.
  }

  loginWithPassword(
    _username: string,
    _password: string,
  ): Observable<Credentials> {
    return of(this.credentials());
  }

  providers(): Observable<readonly AuthProvider[]> {
    return of(this.availableProviders);
  }

  logout(): Observable<void> {
    this.setSession(null);
    return EMPTY;
  }

  refresh(): Observable<Credentials> {
    return of(this.credentials());
  }

  clear(): void {
    this.setSession(null);
  }
}

class TestingPermission implements Permission {
  private readonly credentials = inject(RNF_CREDENTIALS);

  hasPermission(key: string): boolean {
    return this.credentials().hasPermission(key);
  }

  hasAnyPermission(...keys: string[]): boolean {
    return this.credentials().hasAnyPermission(...keys);
  }
}

/** Seed auth credentials and permissions for tests without startup or HTTP providers. */
export function provideRnForgeAuthTesting(
  session: Session | null,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: FakeAuthService,
      useFactory: () => {
        const fake = new FakeAuthService();
        fake.setSession(session);
        return fake;
      },
    },
    { provide: AuthService, useExisting: FakeAuthService },
    {
      provide: RNF_CREDENTIALS,
      useFactory: () => inject(FakeAuthService).credentials,
    },
    { provide: RNF_PERMISSION, useClass: TestingPermission },
    { provide: RNF_AUTH_CONFIG_TOKEN, useValue: DEFAULT_AUTH_CONFIG },
  ]);
}
