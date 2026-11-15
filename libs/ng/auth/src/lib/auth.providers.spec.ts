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
