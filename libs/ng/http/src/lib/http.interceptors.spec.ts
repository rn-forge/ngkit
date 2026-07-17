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
import { basicHttpInterceptor } from './http.interceptors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup(ignoreUrls: string[] = [], headers?: Record<string, string>) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(
        withInterceptors([basicHttpInterceptor(ignoreUrls, headers)]),
      ),
      provideHttpClientTesting(),
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    controller: TestBed.inject(HttpTestingController),
  };
}

// ---------------------------------------------------------------------------
// basicHttpInterceptor
// ---------------------------------------------------------------------------

describe('basicHttpInterceptor', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });

  describe('ignoreUrls passthrough', () => {
    it('forwards the request without modifications when the URL matches an ignored pattern', () => {
      const { http, controller } = setup(['/public']);

      http.get('/public/health').subscribe();
      const req = controller.expectOne('/public/health');
      expect(req.request.headers.keys()).toHaveLength(0);
      req.flush({});
    });

    it('intercepts a URL that does not match any ignored pattern', () => {
      const { http, controller } = setup(['/public'], {
        'X-Api-Key': 'secret',
      });

      http.get('/api/data').subscribe();
      const req = controller.expectOne('/api/data');
      expect(req.request.headers.get('X-Api-Key')).toBe('secret');
      req.flush({});
    });

    it('matches the ignored pattern as a substring', () => {
      const { http, controller } = setup(['/auth/'], { 'X-Token': 'tok' });

      http.get('/api/auth/login').subscribe();
      const req = controller.expectOne('/api/auth/login');
      expect(req.request.headers.has('X-Token')).toBe(false);
      req.flush({});
    });
  });

  describe('header injection', () => {
    it('adds a single custom header to outbound requests', () => {
      const { http, controller } = setup([], { 'X-Tenant': 'acme' });

      http.get('/api/resource').subscribe();
      const req = controller.expectOne('/api/resource');
      expect(req.request.headers.get('X-Tenant')).toBe('acme');
      req.flush({});
    });

    it('adds multiple custom headers to outbound requests', () => {
      const { http, controller } = setup([], {
        'X-App-Id': 'my-app',
        'X-Version': '2',
      });

      http.get('/api/resource').subscribe();
      const req = controller.expectOne('/api/resource');
      expect(req.request.headers.get('X-App-Id')).toBe('my-app');
      expect(req.request.headers.get('X-Version')).toBe('2');
      req.flush({});
    });

    it('makes the request without extra headers when no headers are specified', () => {
      const { http, controller } = setup();

      http.get('/api/resource').subscribe();
      const req = controller.expectOne('/api/resource');
      // only default Angular headers (Accept etc.) may be present — no custom ones
      expect(req.request.headers.has('X-Custom')).toBe(false);
      req.flush({});
    });
  });

  describe('response passthrough', () => {
    it('emits the response body to subscribers', () => {
      const { http, controller } = setup();
      const payload = { id: 1, name: 'widget' };
      let received: unknown;

      http.get('/api/resource').subscribe((r) => (received = r));
      controller.expectOne('/api/resource').flush(payload);

      expect(received).toEqual(payload);
    });

    it('propagates HTTP errors to the subscriber error channel', () => {
      const { http, controller } = setup();
      let errorStatus = 0;

      http
        .get('/api/resource')
        .subscribe({ error: (e) => (errorStatus = e.status) });
      controller
        .expectOne('/api/resource')
        .flush('Not Found', { status: 404, statusText: 'Not Found' });

      expect(errorStatus).toBe(404);
    });
  });
});
