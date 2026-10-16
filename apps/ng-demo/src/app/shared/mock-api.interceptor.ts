import {
  HttpErrorResponse,
  HttpEvent,
  HttpHeaders,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { getJwtForEmail } from './demo-jwt';

interface MockProduct {
  id: number;
  name: string;
  category: string;
  price: number;
  active: boolean;
}

const SEED_PRODUCTS: MockProduct[] = [
  { id: 1, name: 'Widget A', category: 'Widgets', price: 9.99, active: true },
  { id: 2, name: 'Widget B', category: 'Widgets', price: 14.99, active: true },
  { id: 3, name: 'Gadget X', category: 'Gadgets', price: 49.99, active: false },
  { id: 4, name: 'Gadget Y', category: 'Gadgets', price: 79.99, active: true },
  { id: 5, name: 'Doohickey', category: 'Other', price: 4.99, active: true },
];

/** Fields the mock allow-lists for `orderBy` (AIP-132), like a real server would. */
const SORTABLE = ['id', 'name', 'category', 'price'];

let products: MockProduct[] = [];
let versions = new Map<number, number>();
let nextId = 100;
let idempotent = new Map<string, MockProduct>();

/** Resets the in-memory store to the seed data (used by tests). */
export function resetMockApi(): void {
  products = SEED_PRODUCTS.map((p) => ({ ...p }));
  versions = new Map(products.map((p) => [p.id, 1]));
  nextId = 100;
  idempotent = new Map();
}
resetMockApi();

const etagOf = (id: number) => `"v${versions.get(id) ?? 1}"`;

function respond(
  status: number,
  body: unknown,
  headers?: Record<string, string>,
) {
  return of(
    new HttpResponse({ status, body, headers: new HttpHeaders(headers) }),
  );
}

function problem(status: number, title: string, errors?: unknown[]) {
  return throwError(
    () =>
      new HttpErrorResponse({
        status,
        statusText: title,
        error: { title, status, ...(errors ? { errors } : {}) },
      }),
  );
}

function blob(content: string, filename: string, contentType = 'text/csv') {
  return respond(200, new Blob([content], { type: contentType }), {
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
}

const CSV_HEADER = 'id,name,category,price,active\n';

/** Query parameters whether they came from `params` or were written into the URL. */
const queryOf = (req: HttpRequest<unknown>) =>
  new URL(req.urlWithParams, 'https://mock').searchParams;

function listProducts(req: HttpRequest<unknown>) {
  if (req.headers.get('Accept')?.includes('text/csv')) {
    const rows = products.map((p) => Object.values(p).join(',')).join('\n');
    return blob(CSV_HEADER + rows, 'products.csv');
  }

  const params = queryOf(req);
  let rows = [...products];
  const category = params.get('category');
  const name = params.get('name');
  if (category) rows = rows.filter((p) => p.category === category);
  if (name) {
    rows = rows.filter((p) =>
      p.name.toLowerCase().includes(name.toLowerCase()),
    );
  }

  const orderBy = params.get('orderBy');
  if (orderBy) {
    const [field, direction] = orderBy.split(' ');
    if (!SORTABLE.includes(field)) {
      return problem(400, 'Invalid orderBy', [
        { pointer: '/orderBy', detail: `Cannot order by "${field}"` },
      ]);
    }
    const sign = direction === 'desc' ? -1 : 1;
    rows.sort((a, b) => {
      const [x, y] = [
        a[field as keyof MockProduct],
        b[field as keyof MockProduct],
      ];
      return (x < y ? -1 : x > y ? 1 : 0) * sign;
    });
  }

  // AIP-158: the token is opaque to the client; here it is the next offset.
  const pageSize = Number(params.get('pageSize') ?? 25);
  const offset = Number(params.get('pageToken') ?? 0);
  const end = offset + pageSize;
  return respond(200, {
    items: rows.slice(offset, end),
    nextPageToken: end < rows.length ? String(end) : null,
  });
}

function importProducts(req: HttpRequest<unknown>) {
  const validateOnly = queryOf(req).get('validateOnly') === 'true';
  const file = (req.body as FormData).get('file');
  if (file instanceof File && file.name.includes('bad')) {
    return problem(422, 'Import failed', [
      { pointer: '/rows/2/price', detail: 'price must be a number' },
    ]);
  }
  return respond(200, { created: 2, updated: 1, skipped: 0, validateOnly });
}

function handleProductsRoute(
  method: string,
  path: string,
  req: HttpRequest<unknown>,
): Observable<HttpEvent<unknown>> | undefined {
  const base = path.replace(/^.*\/api\/products/, '');

  if (method === 'GET' && base === '') return listProducts(req);
  if (method === 'GET' && base === ':importTemplate') {
    return blob(CSV_HEADER, 'products-template.csv');
  }
  if (method === 'POST' && base === ':import') return importProducts(req);
  if (method === 'POST' && base === ':batchDelete') {
    const ids = (req.body as { ids?: number[] })?.ids ?? [];
    products = products.filter((p) => !ids.includes(p.id));
    return respond(204, null);
  }
  if (method === 'POST' && base === '') {
    const key = req.headers.get('Idempotency-Key');
    const replay = key ? idempotent.get(key) : undefined;
    const created = replay ?? {
      ...(req.body as Omit<MockProduct, 'id'>),
      id: nextId++,
    };
    if (!replay) {
      products.push(created);
      versions.set(created.id, 1);
      if (key) idempotent.set(key, created);
    }
    return respond(201, created, { ETag: etagOf(created.id) });
  }

  const id = /^\/(\d+)$/.exec(base)?.[1];
  const product = products.find((p) => p.id === Number(id));
  if (id === undefined) return undefined;
  if (!product) return problem(404, 'Not Found');

  if (method === 'GET') {
    return respond(200, product, { ETag: etagOf(product.id) });
  }
  if (method === 'PATCH') {
    const ifMatch = req.headers.get('If-Match');
    if (ifMatch && ifMatch !== etagOf(product.id)) {
      return problem(412, 'Precondition Failed');
    }
    const patch = req.body as Partial<MockProduct>;
    if (patch.name !== undefined && patch.name.trim() === '') {
      return problem(422, 'Validation failed', [
        { pointer: '/name', detail: 'name must not be empty' },
      ]);
    }
    Object.assign(product, patch, { id: product.id });
    versions.set(product.id, (versions.get(product.id) ?? 1) + 1);
    return respond(200, product, { ETag: etagOf(product.id) });
  }
  if (method === 'DELETE') {
    products = products.filter((p) => p.id !== product.id);
    return respond(204, null);
  }
  return undefined;
}

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  const { url, method } = req;

  if (!url.includes('/api/')) {
    return next(req);
  }

  if (req.headers.get('X-Demo-Error') === 'true') {
    return throwError(
      () =>
        new HttpErrorResponse({
          status: 500,
          statusText: 'Internal Server Error',
        }),
    );
  }

  // Strip query string for path matching
  const path = url.split('?')[0];

  // Auth login — return token keyed on email
  if (method === 'POST' && path.endsWith('/api/auth/')) {
    const body = req.body as { user?: string } | null;
    return respond(200, {
      access_token: getJwtForEmail(body?.user ?? 'admin@example.com'),
    });
  }

  if (!environment.mockProducts) {
    return next(req);
  }

  return handleProductsRoute(method, path, req) ?? next(req);
};
