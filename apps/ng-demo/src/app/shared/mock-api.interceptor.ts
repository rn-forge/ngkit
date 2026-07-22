import {
  HttpErrorResponse,
  HttpEvent,
  HttpHeaders,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { getJwtForEmail } from './demo-jwt';

const SEED_PRODUCTS = [
  { id: 1, name: 'Widget A', category: 'Widgets', price: 9.99, active: true },
  { id: 2, name: 'Widget B', category: 'Widgets', price: 14.99, active: true },
  { id: 3, name: 'Gadget X', category: 'Gadgets', price: 49.99, active: false },
  { id: 4, name: 'Gadget Y', category: 'Gadgets', price: 79.99, active: true },
  { id: 5, name: 'Doohickey', category: 'Other', price: 4.99, active: true },
];

function ok(body: unknown) {
  return of(new HttpResponse({ status: 200, body }));
}

function blob(content: string, filename: string, contentType = 'text/csv') {
  return of(
    new HttpResponse({
      status: 200,
      body: new Blob([content], { type: contentType }),
      headers: new HttpHeaders({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      }),
    }),
  );
}

function handleProductsRoute(
  method: string,
  path: string,
  req: HttpRequest<unknown>,
): Observable<HttpEvent<unknown>> | undefined {
  // Upload template (must come before the generic upload check)
  if (method === 'GET' && path.endsWith('/api/products/upload/template/')) {
    return blob('id,name,category,price,active\n', 'products-template.csv');
  }

  // Products list
  if (method === 'GET' && path.endsWith('/api/products/')) {
    return ok({ count: SEED_PRODUCTS.length, results: SEED_PRODUCTS });
  }

  // Upload
  if (method === 'POST' && path.endsWith('/api/products/upload/')) {
    return ok({ created: 2, updated: 1, errors: [] });
  }

  // Download
  if (method === 'POST' && path.endsWith('/api/products/download/')) {
    const csv = 'id,name,category,price,active\n1,Widget A,Widgets,9.99,true\n';
    return blob(csv, 'products.csv');
  }

  // Products create (must come after upload/download checks)
  if (method === 'POST' && path.endsWith('/api/products/')) {
    return ok({ ...(req.body as object), id: 99 });
  }

  // Products update
  if (method === 'PUT' && path.includes('/api/products/')) {
    return ok(req.body);
  }

  // Products bulk delete
  if (method === 'DELETE' && path.endsWith('/api/products/bulk-delete/')) {
    const ids = (req.body as { ids?: number[] })?.ids ?? [];
    return ok({
      count: ids.length,
      message: `Deleted ${ids.length} record(s) successfully`,
    });
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
    return ok({
      access_token: getJwtForEmail(body?.user ?? 'admin@example.com'),
    });
  }

  return handleProductsRoute(method, path, req) ?? next(req);
};
