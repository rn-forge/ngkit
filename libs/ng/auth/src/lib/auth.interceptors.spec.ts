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
import { provideRouter } from '@angular/router';
import { RN_FORGE_APP_CONFIG_TOKEN, RouteService } from '@rn-forge/ng/core';
import {
  RNF_AUTH_CONFIG_TOKEN,
  RNF_CREDENTIALS,
  RnForgeAuthConfig,
} from './auth.config';
import { AuthService } from './auth.services';
import { authHttpInterceptor } from './auth.interceptors';

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

// ---------------------------------------------------------------------------
// authHttpInterceptor
// ---------------------------------------------------------------------------

describe('authHttpInterceptor', () => {
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
        // Wire RNF_CREDENTIALS to AuthService.credentials so login/logout updates flow through
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

  describe('ignoreBackendURLs passthrough', () => {
    it('forwards the request unmodified for an ignored URL pattern', () => {
      http.get('/public/data').subscribe();
      const req = controller.expectOne('/public/data');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('passes through any URL containing the ignored substring', () => {
      http.get('/api/public/resource').subscribe();
      const req = controller.expectOne('/api/public/resource');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });
  });

  describe('unauthenticated requests', () => {
    it('throws an Unauthenticated error without making an HTTP request', () => {
      let errorMessage = '';
      http
        .get('/api/data')
        .subscribe({ error: (e: Error) => (errorMessage = e.message) });
      controller.expectNone('/api/data');
      expect(errorMessage).toBe('Unauthenticated');
    });

    it('calls sendToLogin when the user is not authenticated', () => {
      const spy = vi
        .spyOn(authService, 'sendToLogin')
        .mockImplementation(() => undefined);
      http.get('/api/data').subscribe({ error: vi.fn() });
      expect(spy).toHaveBeenCalledOnce();
    });
  });

  describe('authenticated requests', () => {
    beforeEach(() => authService.login(VALID_JWT));

    it('adds the Authorization header with the bearer token', () => {
      http.get('/api/data').subscribe();
      const req = controller.expectOne('/api/data');
      expect(req.request.headers.get('Authorization')).toBe(
        `Bearer ${VALID_JWT}`,
      );
      req.flush({});
    });

    it('preserves existing request headers alongside the Authorization header', () => {
      http.get('/api/data', { headers: { 'X-Custom': 'value' } }).subscribe();
      const req = controller.expectOne('/api/data');
      expect(req.request.headers.get('Authorization')).toBeTruthy();
      expect(req.request.headers.get('X-Custom')).toBe('value');
      req.flush({});
    });

    it('does not call sendToLogin on a successful 200 response', () => {
      const spy = vi
        .spyOn(authService, 'sendToLogin')
        .mockImplementation(() => undefined);
      http.get('/api/data').subscribe();
      controller.expectOne('/api/data').flush({ ok: true });
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
