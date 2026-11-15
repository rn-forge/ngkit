// external imports
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

// internal imports
import { provideRnForgeAuth } from './auth.providers';
import { FullPageNavigation } from './auth.navigation';
import { AuthService } from './auth.services';
import {
  AnonymousCredentials,
  PasswordLoginError,
  Session,
  SessionCredentials,
} from './auth.types';

const session: Session = {
  subject: 'ada',
  provider: 'development',
  roles: ['admin'],
  permissions: ['items.read'],
  expiresAt: '2099-01-01T00:00:00Z',
};

describe('session bootstrap and refresh', () => {
  let controller: HttpTestingController;
  let service: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideRnForgeAuth(),
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    navigate = vi.spyOn(router, 'navigate');
    navigateByUrl = vi.spyOn(router, 'navigateByUrl');
  });
  afterEach(() => {
    expect(navigate).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
    controller.verify();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });
  it.each([200, 401, 500])(
    'starts without navigation on %s',
    async (status) => {
      const log = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const init = TestBed.inject(ApplicationInitStatus);
      const request = controller.expectOne('/auth/session');
      expect(request.request.method).toBe('GET');
      request.flush(status === 200 ? session : {}, {
        status,
        statusText: 'test',
      });
      await init.donePromise;
      expect(service.credentials()).toBeInstanceOf(
        status === 200 ? SessionCredentials : AnonymousCredentials,
      );
      if (status === 200) {
        expect(service.credentials().roles).toEqual(session.roles);
        expect(service.credentials().hasPermission('items.read')).toBe(true);
        expect(service.credentials().session).toEqual(session);
      }
      if (status === 500) {
        expect(log).toHaveBeenCalledTimes(1);
        expect(log.mock.calls[0][0]).toMatch(/^\[rn-forge\.ng\.auth\]/);
      } else expect(log).not.toHaveBeenCalled();
    },
  );
  it('refresh emits and updates credentials for 200 and 401', () => {
    controller
      .expectOne('/auth/session')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    const next = vi.fn();
    service.refresh().subscribe(next);
    controller.expectOne('/auth/session').flush(session);
    expect(next).toHaveBeenLastCalledWith(service.credentials());
    expect(service.credentials()).toBeInstanceOf(SessionCredentials);
    service.refresh().subscribe(next);
    controller
      .expectOne('/auth/session')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(next).toHaveBeenLastCalledWith(service.credentials());
    expect(service.credentials()).toBeInstanceOf(AnonymousCredentials);
  });
  it('passes non-401 refresh errors to the caller', () => {
    controller
      .expectOne('/auth/session')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    const error = vi.fn();
    service.refresh().subscribe({ error });
    controller
      .expectOne('/auth/session')
      .flush({}, { status: 500, statusText: 'Error' });
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500 }),
    );
  });
});

describe('login, providers and logout', () => {
  let controller: HttpTestingController;
  let service: AuthService;
  const assign = vi.fn();
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideRnForgeAuth(),
        { provide: FullPageNavigation, useValue: { assign } },
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);
    navigateByUrl = vi
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValue(true);
    controller
      .expectOne('/auth/session')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    sessionStorage.removeItem('rnf.auth.loginStartedAt');
  });

  afterEach(() => {
    controller.verify();
    sessionStorage.removeItem('rnf.auth.loginStartedAt');
    document.cookie = 'XSRF-TOKEN=; Max-Age=0';
    assign.mockClear();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('navigates to login and records its start without HTTP', () => {
    const now = Date.now();
    service.login('workspace', '/orders?page=2');
    expect(assign).toHaveBeenCalledExactlyOnceWith(
      '/auth/login/workspace?return_to=%2Forders%3Fpage%3D2',
    );
    const started = sessionStorage.getItem('rnf.auth.loginStartedAt');
    expect(started).toMatch(/^\d+$/);
    expect(Number(started)).toBeGreaterThanOrEqual(now);
    expect(Number(started)).toBeLessThanOrEqual(Date.now());
    controller.verify();
  });

  it.each(['https://evil.example/x', '//evil.example', '/\\evil'])(
    'rejects unsafe returnTo %s before side effects',
    (returnTo) => {
      const store = vi.spyOn(Storage.prototype, 'setItem');
      expect(() => service.login('workspace', returnTo)).toThrow(
        /^\[rn-forge\.ng\.auth\]/,
      );
      expect(assign).not.toHaveBeenCalled();
      expect(store).not.toHaveBeenCalled();
    },
  );

  it('logs in with a password and Angular XSRF without navigation', () => {
    document.cookie = 'XSRF-TOKEN=t1';
    const next = vi.fn();
    service.loginWithPassword('ada', 'pw').subscribe(next);
    const request = controller.expectOne('/auth/login/password');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ username: 'ada', password: 'pw' });
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('t1');
    request.flush(session);
    expect(next).toHaveBeenCalledExactlyOnceWith(service.credentials());
    expect(service.credentials()).toBeInstanceOf(SessionCredentials);
    expect(service.credentials().isAuthenticated).toBe(true);
    expect(assign).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it.each([401, 429, 500])(
    'handles password login status %s without changing credentials',
    (status) => {
      const error = vi.fn();
      const credentials = service.credentials();
      service.loginWithPassword('ada', 'pw').subscribe({ error });
      controller
        .expectOne('/auth/login/password')
        .flush({}, { status, statusText: 'Error' });
      const failure = error.mock.calls[0][0];
      if (status === 500) {
        expect(failure).toBeInstanceOf(HttpErrorResponse);
        expect(failure.status).toBe(500);
      } else {
        expect(failure).toBeInstanceOf(PasswordLoginError);
        expect(failure.reason).toBe(
          status === 401 ? 'invalid-credentials' : 'rate-limited',
        );
        expect(failure.message).toMatch(/^\[rn-forge\.ng\.auth\]/);
      }
      expect(service.credentials()).toBe(credentials);
      expect(service.credentials().isAuthenticated).toBe(false);
    },
  );

  it('starts login with the sole navigating provider', () => {
    const login = vi.spyOn(service, 'login');
    service.startLogin('/orders?page=2');
    controller
      .expectOne('/auth/providers')
      .flush([{ id: 'work', name: 'Work', kind: 'oidc' }]);
    expect(login).toHaveBeenCalledExactlyOnceWith('work', '/orders?page=2');
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('opens the login page when a password provider is available', () => {
    service.startLogin('/orders?page=2');
    controller.expectOne('/auth/providers').flush([
      { id: 'dev', name: 'Development', kind: 'development' },
      { id: 'local', name: 'Local', kind: 'password' },
    ]);
    expect(navigateByUrl).toHaveBeenCalledExactlyOnceWith(
      TestBed.inject(Router).createUrlTree(['/login'], {
        queryParams: { returnTo: '/orders?page=2' },
      }),
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it('opens the login page when provider discovery fails', () => {
    service.startLogin('/orders');
    controller.expectOne('/auth/providers').flush(
      {},
      {
        status: 500,
        statusText: 'Error',
      },
    );
    expect(navigateByUrl).toHaveBeenCalledExactlyOnceWith(
      TestBed.inject(Router).createUrlTree(['/login'], {
        queryParams: { returnTo: '/orders' },
      }),
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it('clears credentials locally without HTTP or navigation', () => {
    service.refresh().subscribe();
    controller.expectOne('/auth/session').flush(session);
    expect(service.credentials().isAuthenticated).toBe(true);
    service.clear();
    expect(service.credentials()).toBeInstanceOf(AnonymousCredentials);
    expect(service.credentials().isAuthenticated).toBe(false);
    expect(assign).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
    controller.verify();
  });

  it('lists known providers and warns once per unknown kind', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const next = vi.fn();
    service.providers().subscribe(next);
    const request = controller.expectOne('/auth/providers');
    expect(request.request.method).toBe('GET');
    const providers = [
      { id: 'workspace', name: 'Workspace', kind: 'oidc' },
      { id: 'local', name: 'Local', kind: 'password' },
      { id: 'legacy', name: 'Legacy', kind: 'saml' },
    ];
    request.flush(providers);
    expect(next).toHaveBeenCalledExactlyOnceWith(providers.slice(0, 2));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(
      /^\[rn-forge\.ng\.auth\] unknown provider kind/,
    );
  });

  it.each([
    [200, 'https://idp.example/logout'],
    [200, null],
    [401, null],
    [500, null],
  ])('handles logout status %s with redirect %s', (status, redirect) => {
    service.refresh().subscribe();
    controller.expectOne('/auth/session').flush(session);
    const credentials = service.credentials();
    const next = vi.fn();
    const complete = vi.fn();
    const error = vi.fn();
    service.logout().subscribe({ next, complete, error });
    const request = controller.expectOne('/auth/logout');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({ redirect }, { status, statusText: 'test' });
    expect(next).not.toHaveBeenCalled();
    if (status === 500) {
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({ status: 500 }),
      );
      expect(service.credentials()).toBe(credentials);
      expect(service.credentials().isAuthenticated).toBe(true);
      expect(complete).not.toHaveBeenCalled();
      expect(assign).not.toHaveBeenCalled();
      expect(navigateByUrl).not.toHaveBeenCalled();
    } else {
      expect(error).not.toHaveBeenCalled();
      expect(complete).toHaveBeenCalledTimes(1);
      expect(service.credentials()).toBeInstanceOf(AnonymousCredentials);
      if (redirect) {
        expect(assign).toHaveBeenCalledExactlyOnceWith(redirect);
        expect(navigateByUrl).not.toHaveBeenCalled();
      } else {
        expect(navigateByUrl).toHaveBeenCalledExactlyOnceWith('/login');
        expect(assign).not.toHaveBeenCalled();
      }
    }
  });
});

describe('session expiry warning', () => {
  let controller: HttpTestingController;
  let service: AuthService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideRnForgeAuth(),
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);
    controller
      .expectOne('/auth/session')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
  });

  afterEach(() => {
    controller.verify();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  function expiresIn(minutes: number): Session {
    return {
      ...session,
      expiresAt: new Date(Date.now() + minutes * 60_000).toISOString(),
    };
  }

  function setSession(value: Session): void {
    service.refresh().subscribe();
    controller.expectOne('/auth/session').flush(value);
  }

  it('warns at the configured five minute lead time', () => {
    setSession(expiresIn(10));
    expect(service.expiryWarning()).toBe(false);
    vi.advanceTimersByTime(5 * 60_000);
    expect(service.expiryWarning()).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    controller.verify();
  });

  it('warns immediately when expiry is within the lead time', () => {
    setSession(expiresIn(2));
    expect(service.expiryWarning()).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    controller.verify();
  });

  it('clears the warning after refresh returns a later session', () => {
    setSession(expiresIn(2));
    expect(service.expiryWarning()).toBe(true);
    setSession(expiresIn(60));
    expect(service.expiryWarning()).toBe(false);
    controller.verify();
  });

  it('clears the warning on logout', () => {
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    setSession(expiresIn(2));
    expect(service.expiryWarning()).toBe(true);
    service.logout().subscribe();
    controller.expectOne('/auth/logout').flush({ redirect: null });
    expect(service.expiryWarning()).toBe(false);
    controller.verify();
    vi.restoreAllMocks();
  });

  it('clears the warning and timer when credentials are cleared', () => {
    setSession(expiresIn(10));
    expect(vi.getTimerCount()).toBe(1);
    service.clear();
    expect(service.expiryWarning()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    controller.verify();
  });

  it('reschedules expiry after password login', () => {
    setSession(expiresIn(2));
    expect(service.expiryWarning()).toBe(true);
    service.loginWithPassword('ada', 'pw').subscribe();
    controller.expectOne('/auth/login/password').flush(expiresIn(60));
    expect(service.expiryWarning()).toBe(false);
    expect(vi.getTimerCount()).toBe(1);
    controller.verify();
  });

  it('clears the warning when refresh returns 401', () => {
    setSession(expiresIn(2));
    expect(service.expiryWarning()).toBe(true);
    service.refresh().subscribe();
    controller
      .expectOne('/auth/session')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(service.expiryWarning()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    controller.verify();
  });

  it('does not overflow the timer for a distant session or make a request', () => {
    setSession({ ...session, expiresAt: '2099-01-01T00:00:00Z' });
    expect(service.expiryWarning()).toBe(false);
    vi.advanceTimersByTime(25 * 24 * 60 * 60_000);
    expect(service.expiryWarning()).toBe(false);
    expect(vi.getTimerCount()).toBe(1);
    controller.verify();
  });
});
