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
import { firstValueFrom } from 'rxjs';
import { getJwtForEmail } from './demo-jwt';
import { mockApiInterceptor } from './mock-api.interceptor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function blobToText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([mockApiInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    controller: TestBed.inject(HttpTestingController),
  };
}

// ---------------------------------------------------------------------------
// mockApiInterceptor
// ---------------------------------------------------------------------------

describe('mockApiInterceptor', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });

  it('forwards non-/api/ requests to the backend', () => {
    const { http, controller } = setup();

    http.get('/assets/config.json').subscribe();

    const req = controller.expectOne('/assets/config.json');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('simulates a server error when the X-Demo-Error header is set', async () => {
    const { http } = setup();

    let status = 0;
    await new Promise<void>((resolve) => {
      http
        .get('/api/products/', { headers: { 'X-Demo-Error': 'true' } })
        .subscribe({
          error: (e) => {
            status = e.status;
            resolve();
          },
        });
    });

    expect(status).toBe(500);
  });

  it('returns an access token keyed on the submitted email for login', async () => {
    const { http } = setup();

    const res: unknown = await firstValueFrom(
      http.post('/api/auth/', { user: 'readonly@example.com' }),
    );

    expect(res).toEqual({
      access_token: getJwtForEmail('readonly@example.com'),
    });
  });

  it('defaults login to admin@example.com when no user is given', async () => {
    const { http } = setup();

    const res: unknown = await firstValueFrom(http.post('/api/auth/', {}));

    expect(res).toEqual({
      access_token: getJwtForEmail('admin@example.com'),
    });
  });

  it('returns a CSV template for the upload template route', async () => {
    const { http } = setup();

    const res = await firstValueFrom(
      http.get('/api/products/upload/template/', { responseType: 'blob' }),
    );

    expect(res).toBeInstanceOf(Blob);
    expect(await blobToText(res)).toContain('id,name,category,price,active');
  });

  it('returns the seeded products list', async () => {
    const { http } = setup();

    const res: unknown = await firstValueFrom(http.get('/api/products/'));

    expect(res).toMatchObject({ count: 5 });
    expect((res as { results: unknown[] }).results).toHaveLength(5);
  });

  it('returns an upload summary for a bulk upload', async () => {
    const { http } = setup();

    const res: unknown = await firstValueFrom(
      http.post('/api/products/upload/', new FormData()),
    );

    expect(res).toEqual({ created: 2, updated: 1, errors: [] });
  });

  it('returns a CSV blob for a download request', async () => {
    const { http } = setup();

    const res = await firstValueFrom(
      http.post('/api/products/download/', {}, { responseType: 'blob' }),
    );

    expect(res).toBeInstanceOf(Blob);
    expect(await blobToText(res)).toContain('Widget A');
  });

  it('echoes the request body with a generated id when creating a product', async () => {
    const { http } = setup();

    const res: unknown = await firstValueFrom(
      http.post('/api/products/', { name: 'New Thing' }),
    );

    expect(res).toEqual({ name: 'New Thing', id: 99 });
  });

  it('echoes the request body when updating a product', async () => {
    const { http } = setup();

    const res: unknown = await firstValueFrom(
      http.put('/api/products/7/', { name: 'Updated' }),
    );

    expect(res).toEqual({ name: 'Updated' });
  });

  it('reports a bulk-delete count and message', async () => {
    const { http } = setup();

    const res: unknown = await firstValueFrom(
      http.request('DELETE', '/api/products/bulk-delete/', {
        body: { ids: [1, 2, 3] },
      }),
    );

    expect(res).toEqual({
      count: 3,
      message: 'Deleted 3 record(s) successfully',
    });
  });

  it('treats a missing ids array as an empty bulk delete', async () => {
    const { http } = setup();

    const res: unknown = await firstValueFrom(
      http.request('DELETE', '/api/products/bulk-delete/', { body: {} }),
    );

    expect(res).toEqual({
      count: 0,
      message: 'Deleted 0 record(s) successfully',
    });
  });

  it('forwards unmatched /api/ routes to the backend', () => {
    const { http, controller } = setup();

    http.get('/api/unknown-route/').subscribe();

    const req = controller.expectOne('/api/unknown-route/');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('strips the query string before matching the route', async () => {
    const { http } = setup();

    const res: unknown = await firstValueFrom(
      http.get('/api/products/?page=2'),
    );

    expect(res).toMatchObject({ count: 5 });
  });
});
