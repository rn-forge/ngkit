import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GenericType } from '@rn-forge/ng/core';
import { RN_FORGE_HTTP_CONFIG_TOKEN } from './http.config';
import { basicHttpInterceptor } from './http.interceptors';
import { AbstractHTTPService } from './http.services';

// ---------------------------------------------------------------------------
// Concrete test subclass (same as unit tests — no mocking)
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
  doBlobGet(path: string) {
    return this.DOWNLOAD_GET('blob-get-op', path);
  }
  doBlobPost(path: string, body: unknown) {
    return this.DOWNLOAD_POST('blob-post-op', path, body);
  }
}

// ---------------------------------------------------------------------------
// 1. AbstractHTTPService through basicHttpInterceptor
// ---------------------------------------------------------------------------

describe('AbstractHTTPService + basicHttpInterceptor (integration)', () => {
  let service: TestHttpService;
  let controller: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([
            basicHttpInterceptor([], { 'X-Tenant': 'acme', 'X-Version': '2' }),
          ]),
        ),
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

  it('GET carries custom headers set by basicHttpInterceptor', () => {
    service.doGet<unknown>('detail').subscribe();
    const req = controller.expectOne('/api/items/detail/');
    expect(req.request.headers.get('X-Tenant')).toBe('acme');
    expect(req.request.headers.get('X-Version')).toBe('2');
    req.flush({ id: 1 });
  });

  it('POST carries custom headers and preserves request body', () => {
    const body = { name: 'widget' };
    service.doPost<unknown>('create', body).subscribe();
    const req = controller.expectOne('/api/items/create/');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-Tenant')).toBe('acme');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 99 });
  });

  it('PUT carries custom headers and preserves request body', () => {
    const body = { name: 'updated' };
    service.doPut<unknown>('42', body).subscribe();
    const req = controller.expectOne('/api/items/42/');
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('X-Tenant')).toBe('acme');
    expect(req.request.body).toEqual(body);
    req.flush(body);
  });

  it('DELETE carries custom headers', () => {
    service.doDelete<unknown>('42').subscribe();
    const req = controller.expectOne('/api/items/42/');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.headers.get('X-Tenant')).toBe('acme');
    req.flush(null);
  });

  it('response body flows through interceptor to subscriber', () => {
    const payload = [{ id: 1 }, { id: 2 }];
    let result: unknown;
    service.doGet<unknown>('list').subscribe((v) => (result = v));
    controller.expectOne('/api/items/list/').flush(payload);
    expect(result).toEqual(payload);
  });

  it('error response propagates through interceptor chain to subscriber', () => {
    let errorStatus = 0;
    service
      .doGet<unknown>('detail')
      .subscribe({ error: (e) => (errorStatus = e.status) });
    controller.expectOne('/api/items/detail/').flush('Server Error', {
      status: 500,
      statusText: 'Internal Server Error',
    });
    expect(errorStatus).toBe(500);
  });

  it('DOWNLOAD_GET returns a DownloadResponse with blob and fileName from Content-Disposition', () => {
    const blob = new Blob(['file content'], { type: 'text/csv' });
    let result: import('./http.types').DownloadResponse | undefined;
    service.doBlobGet('export').subscribe((r) => (result = r));
    controller.expectOne('/api/items/export/').flush(blob, {
      headers: { 'Content-Disposition': 'attachment; filename="export.csv"' },
    });
    expect(result).toBeDefined();
    expect(result?.blob).toBeInstanceOf(Blob);
    expect(result?.fileName).toBe('export.csv');
  });

  it('DOWNLOAD_POST returns a DownloadResponse with blob and fileName from Content-Disposition', () => {
    const blob = new Blob(['report'], { type: 'application/pdf' });
    let result: import('./http.types').DownloadResponse | undefined;
    service
      .doBlobPost('report', { filter: 'all' })
      .subscribe((r) => (result = r));
    controller.expectOne('/api/items/report/').flush(blob, {
      headers: { 'Content-Disposition': 'attachment; filename="report.pdf"' },
    });
    expect(result).toBeDefined();
    expect(result?.blob).toBeInstanceOf(Blob);
    expect(result?.fileName).toBe('report.pdf');
  });
});

// ---------------------------------------------------------------------------
// 2. AbstractHTTPService through basicHttpInterceptor with ignore list
// ---------------------------------------------------------------------------

describe('AbstractHTTPService + basicHttpInterceptor ignore list (integration)', () => {
  let service: TestHttpService;
  let controller: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([
            basicHttpInterceptor(['/api/items/health/'], {
              'X-Tenant': 'acme',
            }),
          ]),
        ),
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

  it('ignored URL passes through without custom headers', () => {
    service.doGet<unknown>('health').subscribe();
    const req = controller.expectOne('/api/items/health/');
    expect(req.request.headers.has('X-Tenant')).toBe(false);
    req.flush({ status: 'ok' });
  });

  it('non-ignored URL still receives custom headers', () => {
    service.doGet<unknown>('detail').subscribe();
    const req = controller.expectOne('/api/items/detail/');
    expect(req.request.headers.get('X-Tenant')).toBe('acme');
    req.flush({ id: 1 });
  });
});

// ---------------------------------------------------------------------------
// 3. HttpClient directly through basicHttpInterceptor (no AbstractHTTPService)
// ---------------------------------------------------------------------------

describe('HttpClient + basicHttpInterceptor direct (integration)', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([
            basicHttpInterceptor([], { 'X-Correlation-Id': 'abc123' }),
          ]),
        ),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
    TestBed.resetTestingModule();
  });

  it('header is present on GET request', () => {
    http.get('/external/api').subscribe();
    const req = controller.expectOne('/external/api');
    expect(req.request.headers.get('X-Correlation-Id')).toBe('abc123');
    req.flush({});
  });

  it('header is present on POST request', () => {
    http.post('/external/api', { data: 1 }).subscribe();
    const req = controller.expectOne('/external/api');
    expect(req.request.headers.get('X-Correlation-Id')).toBe('abc123');
    req.flush({});
  });
});
