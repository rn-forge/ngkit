// external imports
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, provideRouter } from '@angular/router';

// internal imports
import { RNF_CREDENTIALS, RNF_PERMISSION } from './auth.config';
import { AuthService } from './auth.services';
import { authGuard, permissionGuard } from './auth.guards';
import {
  AnonymousCredentials,
  Credentials,
  SessionCredentials,
} from './auth.types';

describe('authGuard and permissionGuard', () => {
  const credentials = signal<Credentials>(new AnonymousCredentials());
  const startLogin = vi.fn();

  beforeEach(() => {
    credentials.set(new AnonymousCredentials());
    startLogin.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: RNF_CREDENTIALS, useValue: credentials },
        {
          provide: RNF_PERMISSION,
          useValue: {
            hasPermission: (key: string) => credentials().hasPermission(key),
          },
        },
        { provide: AuthService, useValue: { startLogin } },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  const state = { url: '/items?q=a&sort=b' } as RouterStateSnapshot;
  const run = (guard: typeof authGuard) =>
    TestBed.runInInjectionContext(() => guard({} as never, state));

  it('starts login and denies an anonymous user', () => {
    expect(run(authGuard)).toBe(false);
    expect(startLogin).toHaveBeenCalledExactlyOnceWith(state.url);
  });

  it('allows a signed-in user', () => {
    credentials.set(
      new SessionCredentials({
        subject: 'ada',
        provider: 'development',
        roles: [],
        permissions: [],
        expiresAt: '2099-01-01T00:00:00Z',
      }),
    );
    expect(run(authGuard)).toBe(true);
  });

  it('allows a user with every required permission', () => {
    credentials.set(
      new SessionCredentials({
        subject: 'ada',
        provider: 'development',
        roles: [],
        permissions: ['a.read', 'a.update'],
        expiresAt: '2099-01-01T00:00:00Z',
      }),
    );
    const guard = permissionGuard('a.read', 'a.update');
    expect(run(guard)).toBe(true);
  });

  it('returns the forbidden UrlTree when a permission is missing', () => {
    credentials.set(
      new SessionCredentials({
        subject: 'ada',
        provider: 'development',
        roles: [],
        permissions: ['a.read'],
        expiresAt: '2099-01-01T00:00:00Z',
      }),
    );
    const result = run(permissionGuard('a.read', 'a.update'));
    expect(
      TestBed.inject(Router).serializeUrl(
        result as ReturnType<Router['createUrlTree']>,
      ),
    ).toBe('/forbidden');
  });

  it('starts login for an anonymous user on a permission guard', () => {
    const result = run(permissionGuard('a.read', 'a.update'));
    expect(result).toBe(false);
    expect(startLogin).toHaveBeenCalledExactlyOnceWith(state.url);
  });

  it('rejects a permission guard with no keys when constructed', () => {
    expect(() => permissionGuard()).toThrow(/^\[rn-forge\.ng\.auth\]/);
  });
});
