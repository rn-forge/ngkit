// external imports
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  provideRouter,
} from '@angular/router';

// internal imports
import { RNF_CREDENTIALS, RNF_PERMISSION } from './auth.config';
import { authRouteGuard } from './auth.guards';
import {
  AnonymousCredentials,
  Credentials,
  SessionCredentials,
} from './auth.types';

describe('authRouteGuard', () => {
  const credentials = signal<Credentials>(new AnonymousCredentials());
  beforeEach(() => {
    credentials.set(new AnonymousCredentials());
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
      ],
    });
  });
  afterEach(() => TestBed.resetTestingModule());
  function guard(permission?: string) {
    return TestBed.runInInjectionContext(() =>
      authRouteGuard(
        { data: { permission } } as unknown as ActivatedRouteSnapshot,
        { url: '/items?q=a&sort=b' } as RouterStateSnapshot,
      ),
    );
  }
  it('returns a login UrlTree with the complete returnTo', () => {
    const result = guard('items.read');
    expect(
      TestBed.inject(Router).serializeUrl(
        result as ReturnType<Router['createUrlTree']>,
      ),
    ).toBe('/login?returnTo=%2Fitems%3Fq%3Da%26sort%3Db');
  });
  it('allows a signed-in user without a route permission', () => {
    credentials.set(
      new SessionCredentials({
        subject: 'ada',
        provider: 'development',
        roles: [],
        permissions: [],
        expiresAt: '2099-01-01T00:00:00Z',
      }),
    );
    expect(guard()).toBe(true);
  });
  it('checks a present permission', () => {
    credentials.set(
      new SessionCredentials({
        subject: 'ada',
        provider: 'development',
        roles: [],
        permissions: ['items.read'],
        expiresAt: '2099-01-01T00:00:00Z',
      }),
    );
    expect(guard('items.read')).toBe(true);
    expect(guard('items.write')).toBe(false);
  });
});
