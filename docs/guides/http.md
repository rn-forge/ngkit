# HTTP

ngkit ships no HTTP client ([ADR-0004](../adr/ADR-0004.md)). This guide is the pattern applications use with Angular's `HttpClient`, and the OpenTelemetry setup that goes with it.

## Application HTTP pattern

**One token per backend.** An app-owned `InjectionToken<string>` for each backend, provided once. Load deploy-time values with `provideAppInitializer` + `useFactory` when the URL must change without a rebuild.

```ts
export const ORDERS_API_URL = new InjectionToken<string>('ORDERS_API_URL');
export const INVENTORY_API_URL = new InjectionToken<string>('INVENTORY_API_URL');

// app.config.ts
providers: [provideHttpClient(withFetch(), withInterceptors([httpErrorInterceptor])), { provide: ORDERS_API_URL, useValue: environment.ordersApiUrl }, { provide: INVENTORY_API_URL, useValue: environment.inventoryApiUrl }];
```

**Operation clients compose native `HttpClient`.** Keep one method per operation, with the full typed overloads (`observe`, `responseType`, `context`, `reportProgress`). Prefer a generated client (each generator has its own root-URL setting; point it at the same token). [ADR-0004](../adr/ADR-0004.md)'s serialization and error-representation rules still apply.

```ts
@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(ORDERS_API_URL);

  get(id: string) {
    return this.http.get<Order>(`${this.baseUrl}/orders/${encodeURIComponent(id)}`, { context: new HttpContext().set(OPERATION, 'orders.get') });
  }
}
```

**Error handling has three layers, and none of them is per-method `catchError`:**

1. HTTP spans come from OpenTelemetry auto-instrumentation ([Telemetry](#telemetry-versions-checked-2026-09-22)).
2. App policy (error reporting, 401 → login) lives in one functional interceptor that rethrows the original `HttpErrorResponse`. An `HttpContextToken` named after the OpenAPI `operationId` replaces the old `opName` argument.
3. User-facing recovery happens at the call site or through `httpResource()`'s `error()` signal, only where a screen behaves differently.

```ts
export const OPERATION = new HttpContextToken<string>(() => 'unknown');

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const reporter = inject(ErrorReporter); // app-owned
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        reporter.httpError(req.context.get(OPERATION), req, err);
      }
      return throwError(() => err);
    }),
  );
};
```

**Query strings and downloads.** Pass `params` as a record, since Angular encodes it and repeats array keys (OpenAPI `form`/`explode: true`). Angular's default codec leaves `+` unencoded, so supply an `HttpParameterCodec` when that matters, and drop `undefined` values first. Fetch files with `{ responseType: 'blob', observe: 'response' }`. Saving a Blob is DOM glue: use `AppUtil.saveBlob` from `@rn-forge/ng/core`, or a direct `<a href download>` for large cookie-authenticated files. Cross-origin `Content-Disposition` needs `Access-Control-Expose-Headers`.

**Deployment note.** Browsers calling several origins pay for CORS, one token audience per origin and a trace-propagation allowlist. Prefer a same-origin gateway/BFF (`/api/orders`, `/api/inventory`); the tokens above then hold path prefixes and nothing else changes.

## Telemetry (versions checked 2026-09-22)

Verified against npm: `@opentelemetry/api` 1.9.1; `sdk-trace-web`, `sdk-trace-base`, `resources`, `context-zone-peer-dep` 2.11.0; `instrumentation`, `instrumentation-fetch`, `exporter-trace-otlp-http` 0.222.0; `semantic-conventions` 1.43.0. None is deprecated. The stable 2.x SDKs peer on `@opentelemetry/api >=1.0/1.3 <1.10`. The snippet below type-checks with `strict` against those versions. It needs `skipLibCheck` because the exporter and instrumentation packages ship Node typings.

```ts
// main.ts, before bootstrapApplication (zone.js is already loaded by polyfills)
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone-peer-dep';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const provider = new WebTracerProvider({
  resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'my-app' }),
  spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter({ url: '/otel/v1/traces' }))],
});
provider.register({ contextManager: new ZoneContextManager() });
registerInstrumentations({
  instrumentations: [
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [/^https:\/\/orders\.example\.com\//],
    }),
  ],
});
```

Constraints:

- **Instrument the transport Angular actually uses.** `withFetch()` → `instrumentation-fetch`. Angular's default `HttpXhrBackend` → `@opentelemetry/instrumentation-xml-http-request` (same 0.222.0 line).
- **Angular apps use `context-zone-peer-dep`, not `context-zone`.** The latter bundles a second zone.js. Zone context only follows `async`/`await` when it is downleveled, which the Angular CLI does for zone apps. Zoneless apps omit the context manager: HTTP spans are still recorded, but parent/child linking across `await` is lost.
- `traceparent` is injected only for URLs matching `propagateTraceHeaderCorsUrls` (same-origin always). Each listed backend must allow `traceparent` (and `tracestate`) in CORS `Access-Control-Allow-Headers`.
- Export through a same-origin collector path (`/otel/v1/traces`) rather than a third-party origin, which avoids CORS and keeps collector credentials out of the bundle.
- The `@opentelemetry/*` `0.x` packages are still experimental and version together. Pin the whole set to one release line and upgrade it as a unit.
