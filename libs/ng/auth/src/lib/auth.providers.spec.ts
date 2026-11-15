// external imports
import { HttpClient, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

// internal imports
import {
  AuthConfig,
  DEFAULT_AUTH_CONFIG,
  RNF_AUTH_CONFIG_TOKEN,
} from './auth.config';
import { provideRnForgeAuth } from './auth.providers';
import { AuthService } from './auth.services';

describe('provideRnForgeAuth', () => {
  afterEach(() => {
    document.cookie = 'CSRF=; Max-Age=0; path=/';
    TestBed.resetTestingModule();
  });

  it('merges and freezes configuration and apiUrls', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRnForgeAuth({ sessionUrl: '/session' }),
      ],
    });
    const config = TestBed.inject(RNF_AUTH_CONFIG_TOKEN);
    TestBed.inject(HttpTestingController)
      .expectOne('/session')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(config).toEqual({ ...DEFAULT_AUTH_CONFIG, sessionUrl: '/session' });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.apiUrls)).toBe(true);
    expect(Object.isFrozen(DEFAULT_AUTH_CONFIG)).toBe(true);
    expect(Object.isFrozen(DEFAULT_AUTH_CONFIG.apiUrls)).toBe(true);
  });

  const paths = [
    'sessionUrl',
    'providersUrl',
    'loginUrl',
    'passwordLoginUrl',
    'logoutUrl',
    'loginPath',
    'errorPath',
    'forbiddenPath',
    'loggedOutPath',
  ] as const;
  const invalid: Partial<AuthConfig>[] = [
    ...paths.map((field) => ({ [field]: 'relative' })),
    { apiUrls: [] },
    { apiUrls: ['api'] },
    ...(['loopGuardMs', 'expiryLeadMs'] as const).flatMap((field) =>
      [0, -1, NaN, Infinity].map((value) => ({ [field]: value })),
    ),
    { xsrfCookieName: '' },
    { xsrfHeaderName: '' },
  ];
  it.each(invalid)('rejects invalid configuration %j', (config) => {
    expect(() => provideRnForgeAuth(config)).toThrow(/^\[rn-forge\.ng\.auth\]/);
    expect(() => provideRnForgeAuth(config)).toThrow(Object.keys(config)[0]);
  });

  it.each([true, false])(
    'wires custom XSRF names regardless of provider order (%s)',
    (authFirst) => {
      const auth = provideRnForgeAuth({
        xsrfCookieName: 'CSRF',
        xsrfHeaderName: 'X-CSRF',
      });
      TestBed.configureTestingModule({
        providers: [
          ...(authFirst
            ? [auth, provideHttpClient()]
            : [provideHttpClient(), auth]),
          provideHttpClientTesting(),
        ],
      });
      document.cookie = 'CSRF=t1; path=/';
      TestBed.inject(HttpClient).post('/api/items', {}).subscribe();
      const controller = TestBed.inject(HttpTestingController);
      controller
        .expectOne('/auth/session')
        .flush({}, { status: 401, statusText: 'Unauthorized' });
      const request = controller.expectOne('/api/items');
      expect(request.request.headers.get('X-CSRF')).toBe('t1');
      request.flush({});
      controller.verify();
    },
  );
});

describe('focus session refresh', () => {
  let controller: HttpTestingController;
  let service: AuthService;
  const session = {
    subject: 'ada',
    provider: 'development',
    roles: [],
    permissions: ['items.read'],
    expiresAt: '2099-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRnForgeAuth(),
      ],
    });
    service = TestBed.inject(AuthService);
    controller = TestBed.inject(HttpTestingController);
    controller.expectOne('/auth/session').flush(session);
  });

  afterEach(() => {
    controller.verify();
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('fetches the session on focus after startup', () => {
    window.dispatchEvent(new Event('focus'));
    const request = controller.expectOne('/auth/session');
    expect(request.request.method).toBe('GET');
    request.flush(session);
  });

  it('ignores focus while a focus refresh is in flight', () => {
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('focus'));
    controller.expectOne('/auth/session').flush(session);
  });

  it('logs a failed focus refresh once and retains credentials', () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const credentials = service.credentials();
    window.dispatchEvent(new Event('focus'));
    controller
      .expectOne('/auth/session')
      .flush({}, { status: 500, statusText: 'Error' });
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0][0]).toMatch(/^\[rn-forge\.ng\.auth\]/);
    expect(service.credentials()).toBe(credentials);
    expect(service.credentials().isAuthenticated).toBe(true);
    window.dispatchEvent(new Event('focus'));
    controller.expectOne('/auth/session').flush(session);
  });

  it('does not refetch on a timer', () => {
    window.dispatchEvent(new Event('focus'));
    controller.expectOne('/auth/session').flush(session);
    vi.advanceTimersByTime(60 * 60 * 1000);
    controller.expectNone('/auth/session');
  });

  it('removes the focus listener when destroyed', () => {
    window.dispatchEvent(new Event('focus'));
    controller.expectOne('/auth/session').flush(session);
    TestBed.resetTestingModule();
    window.dispatchEvent(new Event('focus'));
    controller.expectNone('/auth/session');
  });
});
