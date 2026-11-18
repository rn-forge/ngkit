// external imports
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

// internal imports
import { authInterceptor } from './auth.interceptors';
import { FullPageNavigation } from './auth.navigation';
import { provideRnForgeAuth } from './auth.providers';
import { AuthService } from './auth.services';
import {
  AnonymousCredentials,
  PasswordLoginError,
  Session,
} from './auth.types';

const session: Session = {
  subject: 'ada',
  provider: 'development',
  roles: ['admin'],
  permissions: ['items.read'],
  expiresAt: '2099-01-01T00:00:00Z',
};
const development = {
  id: 'development',
  name: 'Development',
  kind: 'development',
};
const csrf = { type: 'https://errors.example/csrf-failed' };

describe('auth error policy', () => {
  let controller: HttpTestingController;
  let http: HttpClient;
  let service: AuthService;
  let router: Router;
  let navigate: ReturnType<typeof vi.spyOn>;
  const assign = vi.fn();

  function setup(apiUrls = ['/api']) {
    TestBed.configureTestingModule({
      providers: [
        provideRnForgeAuth({ apiUrls }),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: FullPageNavigation, useValue: { assign } },
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
    service = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    controller.expectOne('/auth/session').flush(session);
  }

  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    controller.verify();
    sessionStorage.clear();
    document.cookie = 'XSRF-TOKEN=; Max-Age=0';
    assign.mockClear();
    vi.restoreAllMocks();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('leaves session refresh failures outside the policy', () => {
    setup(['/auth']);
    service.refresh().subscribe();
    controller
      .expectOne('/auth/session')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(navigate).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it.each([401, 403])(
    'ignores absolute URLs and nonmatching prefixes on %s',
    (status) => {
      setup();
      for (const url of ['https://other.example/api/x', '/apix']) {
        const error = vi.fn();
        http.get(url).subscribe({ error });
        controller.expectOne(url).flush({}, { status, statusText: 'Error' });
        expect(error).toHaveBeenCalledWith(expect.objectContaining({ status }));
      }
      expect(navigate).not.toHaveBeenCalled();
      expect(assign).not.toHaveBeenCalled();
    },
  );

  it.each(['/api', '/api/orders?state=open'])(
    'clears credentials and starts the sole provider for %s',
    (url) => {
      setup();
      const error = vi.fn();
      http.get(url).subscribe({ error });
      controller
        .expectOne(url)
        .flush({}, { status: 401, statusText: 'Unauthorized' });
      expect(service.credentials()).toBeInstanceOf(AnonymousCredentials);
      controller.expectOne('/auth/providers').flush([development]);
      expect(assign).toHaveBeenCalledExactlyOnceWith(
        '/auth/login/development?return_to=%2F',
      );
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({ status: 401 }),
      );
    },
  );

  it('opens the login page when multiple providers are available', () => {
    setup();
    http.get('/api/orders').subscribe({ error: vi.fn() });
    controller
      .expectOne('/api/orders')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    controller
      .expectOne('/auth/providers')
      .flush([development, { id: 'work', name: 'Work', kind: 'oidc' }]);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(
      router.createUrlTree(['/login'], { queryParams: { returnTo: '/' } }),
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it('starts one login for parallel unauthorized requests', () => {
    setup();
    const errors = ['/api/a', '/api/b', '/api/c'].map((url) => {
      const error = vi.fn();
      http.get(url).subscribe({ error });
      return error;
    });
    for (const url of ['/api/a', '/api/b', '/api/c'])
      controller
        .expectOne(url)
        .flush({}, { status: 401, statusText: 'Unauthorized' });
    controller.expectOne('/auth/providers').flush([development]);
    expect(assign).toHaveBeenCalledTimes(1);
    errors.forEach((error) =>
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({ status: 401 }),
      ),
    );
  });

  it('allows another login after credentials become authenticated', () => {
    setup();
    http.get('/api/a').subscribe({ error: vi.fn() });
    controller
      .expectOne('/api/a')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    controller.expectOne('/auth/providers').flush([development]);
    service.refresh().subscribe();
    controller.expectOne('/auth/session').flush(session);
    TestBed.tick();
    http.get('/api/b').subscribe({ error: vi.fn() });
    controller
      .expectOne('/api/b')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    controller.expectOne('/auth/providers').flush([development]);
    expect(assign).toHaveBeenCalledTimes(2);
  });

  it('leaves password failures for the login form even under an API prefix', () => {
    setup(['/auth']);
    const error = vi.fn();
    service.loginWithPassword('ada', 'pw').subscribe({ error });
    controller
      .expectOne('/auth/login/password')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(error).toHaveBeenCalledWith(expect.any(PasswordLoginError));
    expect(navigate).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it.each([5000, 11000])(
    'checks the return loop window at %s ms after startup',
    (elapsed) => {
      vi.useFakeTimers();
      sessionStorage.setItem(
        'rnf.auth.loginStartedAt',
        String(Date.now() - 1000),
      );
      setup();
      expect(sessionStorage.getItem('rnf.auth.loginStartedAt')).toBeNull();
      vi.advanceTimersByTime(elapsed);
      const error = vi.fn();
      http.get('/api/x').subscribe({ error });
      controller
        .expectOne('/api/x')
        .flush({}, { status: 401, statusText: 'Unauthorized' });
      if (elapsed === 5000) {
        expect(navigate).toHaveBeenCalledTimes(1);
        const target = navigate.mock.calls[0][0];
        expect(
          typeof target === 'string' ? target : router.serializeUrl(target),
        ).toBe('/login/error?error=session_not_established');
        expect(assign).not.toHaveBeenCalled();
      } else {
        controller.expectOne('/auth/providers').flush([development]);
        expect(assign).toHaveBeenCalledTimes(1);
        expect(navigate).not.toHaveBeenCalled();
      }
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({ status: 401 }),
      );
    },
  );

  it.each([200, 403])(
    'refreshes the token and retries a CSRF failure only once (%s)',
    (status) => {
      setup();
      document.cookie = 'XSRF-TOKEN=old';
      const next = vi.fn();
      const error = vi.fn();
      http.post('/api/x', {}).subscribe({ next, error });
      controller
        .expectOne('/api/x')
        .flush(csrf, { status: 403, statusText: 'Forbidden' });
      document.cookie = 'XSRF-TOKEN=new';
      controller.expectOne('/auth/session').flush(session);
      const retry = controller.expectOne('/api/x');
      expect(retry.request.method).toBe('POST');
      expect(retry.request.headers.get('X-XSRF-TOKEN')).toBe('new');
      retry.flush(status === 200 ? { saved: true } : csrf, {
        status,
        statusText: 'test',
      });
      if (status === 200)
        expect(next).toHaveBeenCalledExactlyOnceWith({ saved: true });
      else
        expect(error).toHaveBeenCalledWith(
          expect.objectContaining({ status: 403, error: csrf }),
        );
      expect(navigate).not.toHaveBeenCalled();
      expect(assign).not.toHaveBeenCalled();
    },
  );

  it('returns the original CSRF error when refresh fails', () => {
    setup();
    const error = vi.fn();
    http.post('/api/x', {}).subscribe({ error });
    controller
      .expectOne('/api/x')
      .flush(csrf, { status: 403, statusText: 'Forbidden' });
    controller
      .expectOne('/auth/session')
      .flush({}, { status: 500, statusText: 'Error' });
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ status: 403, error: csrf }),
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shares a forbidden refresh and navigation while preserving credentials', () => {
    setup();
    const errors = ['/api/a', '/api/b'].map((url) => {
      const error = vi.fn();
      http.get(url).subscribe({ error });
      return error;
    });
    for (const url of ['/api/a', '/api/b'])
      controller
        .expectOne(url)
        .flush(
          { type: 'https://errors.example/forbidden' },
          { status: 403, statusText: 'Forbidden' },
        );
    controller.expectOne('/auth/session').flush(session);
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/forbidden');
    expect(service.credentials().isAuthenticated).toBe(true);
    expect(assign).not.toHaveBeenCalled();
    errors.forEach((error) =>
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({ status: 403 }),
      ),
    );
  });

  it('sends handled requests without an identity header', () => {
    setup();
    http.get('/api/x').subscribe();
    const request = controller.expectOne('/api/x');
    expect(request.request.headers.has('Author' + 'ization')).toBe(false);
    request.flush({});
  });
});
