import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { getJwtForEmail } from './demo-jwt';
import { mockApiInterceptor, resetMockApi } from './mock-api.interceptor';

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

  it('passes /api/products through to the backend when mockProducts is off', () => {
    const { http, controller } = setup();
    environment.mockProducts = false;
    try {
      http.get('/api/products').subscribe();

      const req = controller.expectOne('/api/products');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    } finally {
      environment.mockProducts = true;
    }
  });

  it('simulates a server error when the X-Demo-Error header is set', async () => {
    const { http } = setup();

    let status = 0;
    await new Promise<void>((resolve) => {
      http
        .get('/api/products', { headers: { 'X-Demo-Error': 'true' } })
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

  describe('products (wire standards)', () => {
    type Page = {
      items: { id: number; name: string }[];
      nextPageToken: string | null;
    };
    const get = <T>(http: HttpClient, url: string) =>
      firstValueFrom(http.get<T>(url));
    const fail = (p: Promise<unknown>) =>
      p.then(
        () => undefined,
        (e: HttpErrorResponse) => e,
      );

    beforeEach(() => resetMockApi());

    it('pages with pageSize and an opaque nextPageToken', async () => {
      const { http } = setup();
      const first = await get<Page>(http, '/api/products?pageSize=2');
      expect(first.items.map((p) => p.id)).toEqual([1, 2]);
      expect(first.nextPageToken).toBe('2');
      const last = await get<Page>(
        http,
        '/api/products?pageSize=2&pageToken=4',
      );
      expect(last.items.map((p) => p.id)).toEqual([5]);
      expect(last.nextPageToken).toBeNull();
    });

    it('orders by an allow-listed field and rejects others with 400', async () => {
      const { http } = setup();
      const desc = await get<Page>(http, '/api/products?orderBy=price%20desc');
      expect(desc.items[0].name).toBe('Gadget Y');
      const err = await fail(get(http, '/api/products?orderBy=active'));
      expect(err?.status).toBe(400);
    });

    it('filters by named query parameters', async () => {
      const { http } = setup();
      const res = await get<Page>(
        http,
        '/api/products?category=Gadgets&name=x',
      );
      expect(res.items.map((p) => p.name)).toEqual(['Gadget X']);
    });

    it('serves a row with its ETag and 404s a missing one', async () => {
      const { http } = setup();
      const res = await firstValueFrom(
        http.get('/api/products/1', { observe: 'response' }),
      );
      expect(res.headers.get('ETag')).toBe('"v1"');
      expect((await fail(get(http, '/api/products/999')))?.status).toBe(404);
    });

    it('creates once per Idempotency-Key', async () => {
      const { http } = setup();
      const post = () =>
        firstValueFrom(
          http.post<{ id: number }>(
            '/api/products',
            { name: 'N' },
            {
              headers: { 'Idempotency-Key': 'k1' },
            },
          ),
        );
      const [a, b] = [await post(), await post()];
      expect(a.id).toBe(b.id);
      expect((await get<Page>(http, '/api/products')).items).toHaveLength(6);
    });

    it('merge-patches with If-Match: new ETag on success, 412 when stale, 422 when invalid', async () => {
      const { http } = setup();
      const patch = (body: object, ifMatch: string) =>
        firstValueFrom(
          http.patch<{ name: string }>('/api/products/1', body, {
            headers: {
              'Content-Type': 'application/merge-patch+json',
              'If-Match': ifMatch,
            },
            observe: 'response',
          }),
        );
      const ok = await patch({ name: 'Renamed' }, '"v1"');
      expect(ok.body?.name).toBe('Renamed');
      expect(ok.headers.get('ETag')).toBe('"v2"');
      expect((await fail(patch({ name: 'x' }, '"v1"')))?.status).toBe(412);
      const invalid = await fail(patch({ name: ' ' }, '"v2"'));
      expect(invalid?.status).toBe(422);
      expect(invalid?.error.errors[0].pointer).toBe('/name');
    });

    it('deletes one and batch-deletes with 204', async () => {
      const { http } = setup();
      await firstValueFrom(http.delete('/api/products/1'));
      await firstValueFrom(
        http.post('/api/products:batchDelete', { ids: [2, 3] }),
      );
      expect(
        (await get<Page>(http, '/api/products')).items.map((p) => p.id),
      ).toEqual([4, 5]);
    });

    it('imports with validateOnly echoed, and 422 row errors for a bad file', async () => {
      const { http } = setup();
      const form = (name: string) => {
        const f = new FormData();
        f.append('file', new File(['x'], name));
        return f;
      };
      const ok = await firstValueFrom(
        http.post('/api/products:import?validateOnly=true', form('rows.csv')),
      );
      expect(ok).toEqual({
        created: 2,
        updated: 1,
        skipped: 0,
        validateOnly: true,
      });
      const bad = await fail(
        firstValueFrom(http.post('/api/products:import', form('bad.csv'))),
      );
      expect(bad?.status).toBe(422);
      expect(bad?.error.errors[0].pointer).toBe('/rows/2/price');
    });

    it('serves the import template and a CSV export named by Content-Disposition', async () => {
      const { http } = setup();
      const template = await firstValueFrom(
        http.get('/api/products:importTemplate', { responseType: 'blob' }),
      );
      expect(await blobToText(template)).toContain(
        'id,name,category,price,active',
      );

      const exported = await firstValueFrom(
        http.get('/api/products', {
          headers: { Accept: 'text/csv' },
          responseType: 'blob',
          observe: 'response',
        }),
      );
      expect(exported.headers.get('Content-Disposition')).toContain(
        'products.csv',
      );
      expect(await blobToText(exported.body as Blob)).toContain('Widget A');
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
    resetMockApi();
    const { http } = setup();

    const res: unknown = await firstValueFrom(
      http.get('/api/products?pageSize=1'),
    );

    expect(res).toMatchObject({ nextPageToken: '1' });
  });
});
