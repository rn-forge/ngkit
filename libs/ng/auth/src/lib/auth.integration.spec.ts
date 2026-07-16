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
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  provideRouter,
} from '@angular/router';
import { RN_FORGE_APP_CONFIG_TOKEN, RouteService } from '@rn-forge/ng/core';
import { basicHttpInterceptor } from '@rn-forge/ng/http';
import {
  RNF_AUTH_CONFIG_TOKEN,
  RNF_CREDENTIALS,
  RnForgeAuthConfig,
} from './auth.config';
import { authRouteGuard } from './auth.guards';
import { authHttpInterceptor } from './auth.interceptors';
import { provideRnForgeAuthConfig } from './auth.providers';
import { AuthService } from './auth.services';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toBase64Url(s: string) {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function makeJwt(payload: Record<string, unknown>): string {
  return `${toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${toBase64Url(JSON.stringify(payload))}.fakesig`;
}

const VALID_JWT = makeJwt({
  sub: 'user@example.com',
  aud: 'app',
  iss: 'issuer',
  exp: 9_999_999_999,
  iat: 1_000_000_000,
  profile: { permissions: ['read'], groups: [] },
});

const CONFIG: RnForgeAuthConfig = {
  frontend: {
    disableAuth: false,
    loginPath: '/auth?mode=login',
    ignoreAppRoutes: ['/auth'],
  },
  backend: { ignoreBackendURLs: ['/public'] },
};

function mockRoute(data: Record<string, unknown> = {}): ActivatedRouteSnapshot {
  return { data } as unknown as ActivatedRouteSnapshot;
}
function mockState(url: string): RouterStateSnapshot {
  return { url } as unknown as RouterStateSnapshot;
}

// ---------------------------------------------------------------------------
// 1. authHttpInterceptor + real AuthService (no service mocking)
// ---------------------------------------------------------------------------

describe('authHttpInterceptor + AuthService (integration)', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let authService: AuthService;
  let routeService: RouteService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authHttpInterceptor()])),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: RN_FORGE_APP_CONFIG_TOKEN,
          useValue: { appName: 'test-app' },
        },
        { provide: RNF_AUTH_CONFIG_TOKEN, useValue: CONFIG },
        {
          provide: RNF_CREDENTIALS,
          useFactory: (auth: AuthService) => auth.credentials,
          deps: [AuthService],
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    routeService = TestBed.inject(RouteService);
    vi.spyOn(routeService, 'navigateByUrl').mockImplementation(() => undefined);
  });

  afterEach(() => {
    controller.verify();
    TestBed.resetTestingModule();
  });

  it('adds Authorization header after real login()', () => {
    authService.login(VALID_JWT);
    http.get('/api/data').subscribe();
    const req = controller.expectOne('/api/data');
    expect(req.request.headers.get('Authorization')).toBe(
      `Bearer ${VALID_JWT}`,
    );
    req.flush({});
  });

  it('blocks request and throws after real logout()', () => {
    authService.login(VALID_JWT);
    authService.logout();
    let errorMessage = '';
    http
      .get('/api/data')
      .subscribe({ error: (e: Error) => (errorMessage = e.message) });
    controller.expectNone('/api/data');
    expect(errorMessage).toBe('Unauthenticated');
  });

  it('passes ignored URL without Authorization even after login', () => {
    authService.login(VALID_JWT);
    http.get('/public/health').subscribe();
    const req = controller.expectOne('/public/health');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('calls sendToLogin via real routeService on unauthenticated request', () => {
    http.get('/api/data').subscribe({ error: vi.fn() });
    controller.expectNone('/api/data');
    expect(routeService.navigateByUrl).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2. authRouteGuard + real AuthService (no isAuthenticated mock)
// ---------------------------------------------------------------------------

describe('authRouteGuard + AuthService (integration)', () => {
  let authService: AuthService;

  function runGuard(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return TestBed.runInInjectionContext(() => authRouteGuard(route, state));
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: RN_FORGE_APP_CONFIG_TOKEN,
          useValue: { appName: 'test-app' },
        },
        // provideRnForgeAuthConfig wires RNF_PERMISSION (CredentialPermission) and
        // RNF_CREDENTIALS (authService.credentials) for real integration testing
        provideRnForgeAuthConfig(CONFIG),
      ],
    });
    authService = TestBed.inject(AuthService);
    vi.spyOn(authService, 'sendToLogin').mockImplementation(() => undefined);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('returns false before login', () => {
    expect(runGuard(mockRoute(), mockState('/dashboard'))).toBe(false);
  });

  it('returns true after real login()', () => {
    authService.login(VALID_JWT);
    expect(runGuard(mockRoute(), mockState('/dashboard'))).toBe(true);
  });

  it('returns false after login() then logout()', () => {
    authService.login(VALID_JWT);
    authService.logout();
    expect(runGuard(mockRoute(), mockState('/dashboard'))).toBe(false);
  });

  it('returns true for a route requiring a permission the user has', () => {
    authService.login(VALID_JWT);
    expect(
      runGuard(mockRoute({ permission: 'read' }), mockState('/items')),
    ).toBe(true);
  });

  it('returns false for a route requiring a permission the user lacks', () => {
    authService.login(VALID_JWT);
    expect(
      runGuard(mockRoute({ permission: 'admin' }), mockState('/admin')),
    ).toBe(false);
  });

  it('allows ignored route for unauthenticated user', () => {
    expect(runGuard(mockRoute(), mockState('/auth?mode=login'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. basicHttpInterceptor + authHttpInterceptor in series
// ---------------------------------------------------------------------------

describe('basicHttpInterceptor + authHttpInterceptor in series (integration)', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let authService: AuthService;
  let routeService: RouteService;

  const APP_HEADERS = { 'X-App-Id': 'my-app' };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([
            basicHttpInterceptor([], APP_HEADERS),
            authHttpInterceptor(),
          ]),
        ),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: RN_FORGE_APP_CONFIG_TOKEN,
          useValue: { appName: 'test-app' },
        },
        { provide: RNF_AUTH_CONFIG_TOKEN, useValue: CONFIG },
        {
          provide: RNF_CREDENTIALS,
          useFactory: (auth: AuthService) => auth.credentials,
          deps: [AuthService],
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    routeService = TestBed.inject(RouteService);
    vi.spyOn(routeService, 'navigateByUrl').mockImplementation(() => undefined);
  });

  afterEach(() => {
    controller.verify();
    TestBed.resetTestingModule();
  });

  it('authenticated request carries both X-App-Id and Authorization headers', () => {
    authService.login(VALID_JWT);
    http.get('/api/data').subscribe();
    const req = controller.expectOne('/api/data');
    expect(req.request.headers.get('X-App-Id')).toBe('my-app');
    expect(req.request.headers.get('Authorization')).toBe(
      `Bearer ${VALID_JWT}`,
    );
    req.flush({});
  });

  it('unauthenticated request is blocked before reaching the server', () => {
    let error = '';
    http
      .get('/api/data')
      .subscribe({ error: (e: Error) => (error = e.message) });
    controller.expectNone('/api/data');
    expect(error).toBe('Unauthenticated');
  });

  it('auth-ignored URL passes through both interceptors without Authorization', () => {
    authService.login(VALID_JWT);
    http.get('/public/health').subscribe();
    const req = controller.expectOne('/public/health');
    // basicHttpInterceptor adds X-App-Id even for ignored-by-auth URLs
    expect(req.request.headers.get('X-App-Id')).toBe('my-app');
    // authHttpInterceptor skips this URL — no Authorization
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
