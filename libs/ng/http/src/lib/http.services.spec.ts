import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GenericType } from '@rn-forge/ng/core';
import { RN_FORGE_HTTP_CONFIG_TOKEN } from './http.config';
import { AbstractHTTPService } from './http.services';

// ---------------------------------------------------------------------------
// Concrete test subclass
// ---------------------------------------------------------------------------

@Injectable()
class TestHttpService extends AbstractHTTPService {
  constructor() {
    super('items');
  }

  doGet<T>(path: string, params?: GenericType) {
    return this.GET<T>('get-op', path, params);
  }
  doPost<T>(path: string, body: unknown, params?: GenericType) {
    return this.POST<T>('post-op', path, body, params);
  }
  doPut<T>(path: string, body: unknown) {
    return this.PUT<T>('put-op', path, body);
  }
  doDelete<T>(path: string, body?: unknown) {
    return this.DELETE<T>('del-op', path, body);
  }

  exposedQueryString(params?: GenericType) {
    return this.getQueryString(params);
  }
  exposedEndpoint(suffix?: string) {
    return this.getEndpoint(suffix);
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

describe('AbstractHTTPService', () => {
  let service: TestHttpService;
  let controller: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TestHttpService,
        {
          provide: RN_FORGE_HTTP_CONFIG_TOKEN,
          useValue: { apiBasePath: '/api' },
        },
      ],
    });
    service = TestBed.inject(TestHttpService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
    TestBed.resetTestingModule();
  });

  // ---- getQueryString -------------------------------------------------------

  describe('getQueryString()', () => {
    it('returns an empty string when params are undefined', () => {
      expect(service.exposedQueryString()).toBe('');
    });

    it('returns "?" for an empty params object (empty object is truthy)', () => {
      expect(service.exposedQueryString({})).toBe('?');
    });

    it('builds a query string from a single param', () => {
      expect(service.exposedQueryString({ page: 1 })).toBe('?page=1');
    });

    it('joins multiple params with &', () => {
      const qs = service.exposedQueryString({ page: 1, size: 20 });
      expect(qs).toContain('page=1');
      expect(qs).toContain('size=20');
      expect(qs.startsWith('?')).toBe(true);
    });
  });

  // ---- getEndpoint ---------------------------------------------------------

  describe('getEndpoint()', () => {
    it('returns basePath with trailing slash when no suffix given', () => {
      expect(service.exposedEndpoint()).toBe('/api/items/');
    });

    it('returns basePath with trailing slash when suffix is empty string', () => {
      expect(service.exposedEndpoint('')).toBe('/api/items/');
    });

    it('appends the suffix with surrounding slashes and deduplicates', () => {
      expect(service.exposedEndpoint('detail')).toBe('/api/items/detail/');
    });
  });

  // ---- GET -----------------------------------------------------------------

  describe('GET()', () => {
    it('makes a GET request to the correct endpoint', () => {
      service.doGet<{ id: number }>('detail').subscribe();
      const req = controller.expectOne('/api/items/detail/');
      expect(req.request.method).toBe('GET');
      req.flush({ id: 1 });
    });

    it('appends query params to the URL', () => {
      service.doGet<unknown>('list', { page: 2, size: 10 }).subscribe();
      const req = controller.expectOne((r) =>
        r.url.includes('/api/items/list/'),
      );
      expect(req.request.urlWithParams).toContain('page=2');
      expect(req.request.urlWithParams).toContain('size=10');
      req.flush([]);
    });

    it('emits the response body to subscribers', () => {
      const payload = { name: 'widget' };
      let result: unknown;
      service.doGet<unknown>('detail').subscribe((v) => (result = v));
      controller.expectOne('/api/items/detail/').flush(payload);
      expect(result).toEqual(payload);
    });
  });

  // ---- POST ----------------------------------------------------------------

  describe('POST()', () => {
    it('makes a POST request with the supplied body', () => {
      const body = { name: 'new-item' };
      service.doPost<unknown>('create', body).subscribe();
      const req = controller.expectOne('/api/items/create/');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ id: 99 });
    });

    it('appends query params to the POST URL', () => {
      service.doPost<unknown>('create', {}, { dry_run: true }).subscribe();
      const req = controller.expectOne((r) =>
        r.url.includes('/api/items/create/'),
      );
      expect(req.request.urlWithParams).toContain('dry_run=true');
      req.flush({});
    });
  });

  // ---- PUT -----------------------------------------------------------------

  describe('PUT()', () => {
    it('makes a PUT request with the supplied body', () => {
      const body = { name: 'updated' };
      service.doPut<unknown>('42', body).subscribe();
      const req = controller.expectOne('/api/items/42/');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(body);
      req.flush(body);
    });
  });

  // ---- DELETE --------------------------------------------------------------

  describe('DELETE()', () => {
    it('makes a DELETE request to the correct endpoint', () => {
      service.doDelete<unknown>('42').subscribe();
      const req = controller.expectOne('/api/items/42/');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('adds the body to request options when a body is provided', () => {
      service.doDelete<unknown>('42', { reason: 'cleanup' }).subscribe();
      const req = controller.expectOne('/api/items/42/');
      expect(req.request.body).toEqual({ reason: 'cleanup' });
      req.flush(null);
    });
  });

  // ---- error handling ------------------------------------------------------

  describe('handleError()', () => {
    it('propagates an HttpErrorResponse to the subscriber error channel', () => {
      let caughtError: unknown;
      service
        .doGet<unknown>('detail')
        .subscribe({ error: (e) => (caughtError = e) });
      controller.expectOne('/api/items/detail/').flush('Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
      });
      expect(caughtError).toBeInstanceOf(HttpErrorResponse);
      expect((caughtError as HttpErrorResponse).status).toBe(500);
    });

    it('propagates a 404 response as an HttpErrorResponse', () => {
      let caughtError: unknown;
      service
        .doGet<unknown>('missing')
        .subscribe({ error: (e) => (caughtError = e) });
      controller
        .expectOne('/api/items/missing/')
        .flush('Not Found', { status: 404, statusText: 'Not Found' });
      expect((caughtError as HttpErrorResponse).status).toBe(404);
    });
  });
});
