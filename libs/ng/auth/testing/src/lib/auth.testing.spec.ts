// external imports
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, throwError } from 'rxjs';

// internal imports
import {
  AuthService,
  DEFAULT_AUTH_CONFIG,
  HasPermissionDirective,
  RNF_AUTH_CONFIG_TOKEN,
  RNF_CREDENTIALS,
  RNF_PERMISSION,
  Session,
} from '@rn-forge/ng/auth';
import { FakeAuthService, provideRnForgeAuthTesting } from './auth.testing';

@Component({
  imports: [HasPermissionDirective],
  template: `<span *rnfHasPermission="'orders.read'">Orders</span>`,
})
class PermissionHostComponent {}

describe('provideRnForgeAuthTesting', () => {
  const session: Session = {
    subject: 'ada',
    provider: 'dev',
    roles: [],
    permissions: ['orders.read'],
    expiresAt: '2099-01-01T00:00:00Z',
  };

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('seeds credentials and permissions with one fake and no HTTP requests', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        provideRnForgeAuthTesting(session),
      ],
    });
    expect(TestBed.inject(RNF_CREDENTIALS)().isAuthenticated).toBe(true);
    expect(TestBed.inject(RNF_CREDENTIALS)).toBe(
      TestBed.inject(FakeAuthService).credentials,
    );
    const permission = TestBed.inject(RNF_PERMISSION);
    expect(permission.hasPermission('orders.read')).toBe(true);
    expect(permission.hasPermission('orders.update')).toBe(false);
    expect(TestBed.inject(AuthService)).toBe(TestBed.inject(FakeAuthService));
    expect(TestBed.inject(RNF_AUTH_CONFIG_TOKEN)).toBe(DEFAULT_AUTH_CONFIG);
    window.dispatchEvent(new Event('focus'));
    TestBed.inject(HttpTestingController).verify();
  });

  it('provides anonymous credentials and denies permissions without HttpClient', () => {
    TestBed.configureTestingModule({
      providers: [provideRnForgeAuthTesting(null)],
    });
    expect(TestBed.inject(AuthService).credentials().isAuthenticated).toBe(
      false,
    );
    expect(TestBed.inject(RNF_CREDENTIALS)().session).toBeNull();
    const permission = TestBed.inject(RNF_PERMISSION);
    expect(permission.hasPermission('orders.read')).toBe(false);
    expect(permission.hasPermission('orders.update')).toBe(false);
    expect(permission.hasAnyPermission('orders.read', 'orders.update')).toBe(
      false,
    );
    expect(permission.hasAnyPermission()).toBe(false);
  });

  it('updates permission answers when the session is replaced or cleared', () => {
    TestBed.configureTestingModule({
      providers: [provideRnForgeAuthTesting(session)],
    });
    const fake = TestBed.inject(FakeAuthService);
    const permission = TestBed.inject(RNF_PERMISSION);
    fake.setSession({ ...session, permissions: ['orders.update'] });
    expect(permission.hasPermission('orders.read')).toBe(false);
    expect(permission.hasPermission('orders.update')).toBe(true);
    expect(permission.hasAnyPermission('orders.read', 'orders.update')).toBe(
      true,
    );
    fake.setSession(null);
    expect(permission.hasPermission('orders.update')).toBe(false);
  });

  it('exposes manually controlled expiry warnings through AuthService', () => {
    TestBed.configureTestingModule({
      providers: [provideRnForgeAuthTesting(session)],
    });
    expect(TestBed.inject(AuthService).expiryWarning()).toBe(false);
    TestBed.inject(FakeAuthService).setExpiryWarning(true);
    expect(TestBed.inject(AuthService).expiryWarning()).toBe(true);
  });

  it('records login and completes logout without emitting, clearing credentials', () => {
    TestBed.configureTestingModule({
      providers: [provideRnForgeAuthTesting(session)],
    });
    const fake = TestBed.inject(FakeAuthService);
    const service = TestBed.inject(AuthService);
    service.login('dev', '/x');
    expect(fake.logins).toEqual([{ provider: 'dev', returnTo: '/x' }]);
    const next = vi.fn();
    const complete = vi.fn();
    service.logout().subscribe({ next, complete });
    expect(next).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledOnce();
    expect(service.credentials().isAuthenticated).toBe(false);
  });

  it.each([session, null])(
    'renders permitted content only with a seeded permission (%j)',
    (seed) => {
      TestBed.configureTestingModule({
        imports: [PermissionHostComponent],
        providers: [provideRnForgeAuthTesting(seed)],
      });
      const fixture = TestBed.createComponent(PermissionHostComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe(seed ? 'Orders' : '');
    },
  );

  it('returns current credentials and configured providers without navigating', async () => {
    TestBed.configureTestingModule({
      providers: [provideRnForgeAuthTesting(session)],
    });
    const fake = TestBed.inject(FakeAuthService);
    expect(await firstValueFrom(fake.providers())).toEqual([]);
    const providers = [
      { id: 'dev', name: 'Development', kind: 'development' as const },
    ];
    fake.setProviders(providers);
    expect(await firstValueFrom(fake.providers())).toBe(providers);
    fake.startLogin('/x');
    expect(fake.logins).toEqual([]);
    expect(await firstValueFrom(fake.loginWithPassword('ada', 'secret'))).toBe(
      fake.credentials(),
    );
    expect(await firstValueFrom(fake.refresh())).toBe(fake.credentials());
    fake.clear();
    expect(fake.credentials().isAuthenticated).toBe(false);
  });

  it('allows tests to override methods with spies', async () => {
    TestBed.configureTestingModule({
      providers: [provideRnForgeAuthTesting(session)],
    });
    const error = new Error('Login failed');
    vi.spyOn(
      TestBed.inject(FakeAuthService),
      'loginWithPassword',
    ).mockReturnValue(throwError(() => error));
    await expect(
      firstValueFrom(
        TestBed.inject(AuthService).loginWithPassword('ada', 'bad'),
      ),
    ).rejects.toBe(error);
  });
});
