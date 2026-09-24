# ngkit roadmap

Reviewed 2026-09-23. H1, H2R, H3.1 (storage), H3.2 (core items) and H4.5 steps
1–7 are complete (see the completion record). **H4 is awaiting owner review**
before H4.6. H5 (OIDC
client auth) is planned. E1, E2 and T1–T3 are proposals; the APIs they describe don't
exist yet.

Every item follows the **Design principles** in the ngkit `README.md` (the pykit
principles applied to Angular). Where a section below conflicts with them, the
principles win unless the section records the deviation and its reason.

References beginning `pykit:` are relative to `rn-forge/pykit`; all other paths
are relative to ngkit. Read `CLAUDE.md` and `README.md` before implementing.
Preserve unrelated working-tree changes.

`docs/plans/cims-extraction-plan.md` and `cims-adoption-plan.md` are proposals,
not implemented capabilities. Reconcile the theme/date/core work with them; do
not create competing theme services or duplicate packages.

## H1 — Packaging and compatibility prerequisites (first library PR) — completed 2026-09-20

Files: `libs/ng/package.json`, core/http/auth entry-point dependency imports,
consumer fixture, library build/pack validation.

- Validate Angular 22.0 and 22.1 consumers using built tarballs, both with zone
  and zoneless change detection. Set supported peers to the tested range (e.g.
  `>=22.0.6 <23` only after matrix passes), not an untested next major.
- Separate library runtime dependencies from consumer framework peers. lodash-es,
  build-url-ts and jwt-decode are currently mandatory peers of the entire package.
  A storage/date consumer should not need to manage auth/HTTP implementation
  dependencies. Move genuine implementation dependencies into package dependencies
  with ng-packagr allowedNonPeerDependencies as needed; remove unused dependencies
  after checking imports. Avoid moving framework packages out of peers.
- Test package exports and actual `.tgz` installation in an isolated consumer.
  No workspace protocols, source aliases, absolute local paths or undeclared
  runtime imports may remain. Validate all secondary entry points.
- Preserve fixed/grouped releases. dist is built before versioning and is
  read-only afterward; do not rebuild after release version stamps manifests.
- Done: fresh consumer installs one Angular runtime without peer overrides;
  core-only production bundle has no Bootstrap/jQuery/auth runtime code.

## H2R — Retire `@rn-forge/ng/http` — completed 2026-09-23

The basic HTTP client is Angular's `HttpClient`. ngkit ships no HTTP entry point.

### H2R.0 — HTTP authority rules

- OpenAPI 3.1 plus the standards referenced by the API document are the sole
  authority for paths, methods, parameter serialization, headers, media types,
  request/response schemas, status codes, security and errors. ngkit must not
  create a parallel client schema or silently change the documented wire
  behavior.
- An operation client owns one method per OpenAPI operation. Its method name,
  input/output types and serialization follow the document, preferably through
  generation. A hand-written client follows the same rule and is tested against
  the document.
- Framework implementation is unobservable. Do not mention or detect Python,
  Django, DRF, FastAPI or pykit behavior in ngkit.
- Do not add resource models, request/response base types, problem types,
  pagination envelopes, health models, header-name constants, error taxonomies
  or domain adapters. Generated/application code owns document schemas.
- Do not add retries, caching, deduplication, polling, redirects, authentication,
  tracing, logging, metrics, idempotency, concurrency or error mapping to a
  transport wrapper. Use Angular interceptors or the application's observability
  layer when the OpenAPI/HTTP contract calls for them.

### H2R.1 — Why

The last version of `OpenApiHttpService` was `inject(HttpClient)` plus `${baseUrl}${path}`.
That did not justify a public entry point:

- **One global base URL.** `RN_FORGE_HTTP_CONFIG` holds one `baseUrl`, but apps
  call several backends. A singleton injected into every service makes that
  worse, and generalizing it (per-service tokens, overridable `baseUrl`) just
  re-creates what an app-owned `InjectionToken` already does.
- **The name promises behaviour it doesn't have.** Nothing in the class reads an
  OpenAPI document; any HTTP API client would use it the same way.
- **Composition costs the same.** Two `inject()` field initializers replace
  `extends`, with no constructor coupling.
- **No boilerplate saved.** The largest real saving is a generated client,
  which does not need ngkit either.

Do not rename it, generalize it or add a second "basic" client. The basic HTTP
client is Angular's `HttpClient`.

### H2R.3 — Application HTTP pattern

Record this where consumer guidance lives (the `ng` README or the consuming
app), not in a library entry point.

**One token per backend.** An app-owned `InjectionToken<string>` for each
backend, provided once. Load deploy-time values with `provideAppInitializer` +
`useFactory` when the URL must change without a rebuild.

```ts
export const ORDERS_API_URL = new InjectionToken<string>('ORDERS_API_URL');
export const INVENTORY_API_URL = new InjectionToken<string>('INVENTORY_API_URL');

// app.config.ts
providers: [provideHttpClient(withFetch(), withInterceptors([httpErrorInterceptor])), { provide: ORDERS_API_URL, useValue: environment.ordersApiUrl }, { provide: INVENTORY_API_URL, useValue: environment.inventoryApiUrl }];
```

**Operation clients compose native `HttpClient`.** Keep one method per
operation, with the full typed overloads (`observe`, `responseType`, `context`,
`reportProgress`). Prefer a generated client (each generator has its own
root-URL setting; point it at the same token). H2R.0's serialization and
error-representation rules still apply.

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

1. HTTP spans come from OpenTelemetry auto-instrumentation (H2R.4).
2. App policy (error reporting, 401 → login) lives in one functional
   interceptor that rethrows the original `HttpErrorResponse`. An
   `HttpContextToken` named after the OpenAPI `operationId` replaces the old
   `opName` argument.
3. User-facing recovery happens at the call site or through `httpResource()`'s
   `error()` signal, only where a screen behaves differently.

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

**Query strings and downloads.** Pass `params` as a record, since Angular encodes
it and repeats array keys (OpenAPI `form`/`explode: true`). Angular's default
codec leaves `+` unencoded, so supply an `HttpParameterCodec` when that matters,
and drop `undefined` values first. Fetch files with
`{ responseType: 'blob', observe: 'response' }`. Saving a Blob is DOM glue:
use `AppUtil.saveBlob` from `@rn-forge/ng/core`, or a direct `<a href download>` for large cookie-authenticated
files. Cross-origin `Content-Disposition` needs `Access-Control-Expose-Headers`.

**Deployment note.** Browsers calling several origins pay for CORS, one token
audience per origin and a trace-propagation allowlist. Prefer a same-origin
gateway/BFF (`/api/orders`, `/api/inventory`); the tokens above then hold path
prefixes and nothing else changes.

### H2R.4 — OpenTelemetry browser setup (verified 2026-09-22)

Verified against npm: `@opentelemetry/api` 1.9.1; `sdk-trace-web`,
`sdk-trace-base`, `resources`, `context-zone-peer-dep` 2.11.0;
`instrumentation`, `instrumentation-fetch`, `exporter-trace-otlp-http` 0.222.0;
`semantic-conventions` 1.43.0. None is deprecated. The stable 2.x SDKs peer on
`@opentelemetry/api >=1.0/1.3 <1.10`. The snippet below type-checks with
`strict` against those versions. It needs `skipLibCheck` because the exporter
and instrumentation packages ship Node typings.

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

- **Instrument the transport Angular actually uses.** `withFetch()` →
  `instrumentation-fetch`. Angular's default `HttpXhrBackend` →
  `@opentelemetry/instrumentation-xml-http-request` (same 0.222.0 line).
- **Angular apps use `context-zone-peer-dep`, not `context-zone`.** The latter
  bundles a second zone.js. Zone context only follows `async`/`await` when it is
  downleveled, which the Angular CLI does for zone apps. Zoneless apps omit the
  context manager: HTTP spans are still recorded, but parent/child linking across
  `await` is lost.
- `traceparent` is injected only for URLs matching
  `propagateTraceHeaderCorsUrls` (same-origin always). Each listed backend must
  allow `traceparent` (and `tracestate`) in CORS `Access-Control-Allow-Headers`.
- Export through a same-origin collector path (`/otel/v1/traces`) rather than a
  third-party origin, which avoids CORS and keeps collector credentials out of
  the bundle.
- The `@opentelemetry/*` `0.x` packages are still experimental and version
  together. Pin the whole set to one release line and upgrade it as a unit.

### H2R.5 — What may return to ngkit, and when

- **Telemetry.** An optional `@rn-forge/ng/telemetry` entry point
  (`provideRnForgeTelemetry({ serviceName, exporterUrl, propagateTo, transport })`
  plus the `OPERATION` token and a reporting interceptor), once two apps need the
  same H2R.4 setup. It wraps a standard rather than re-implementing `HttpClient`.
  Keep the OTel packages as optional peers so non-telemetry consumers don't
  install them.
- **Generic CRUD client.** Not in `ng`. A generic `RestResource<T>` encodes a
  backend convention (list envelope, ID type, PUT vs PATCH, nested routes). That
  is the same adapter dialect removed with `http/crud`. Prefer generated
  clients; otherwise an app may keep a ~15-line generic base of its own that
  implements the screen's data-source contract (H4.2). Only a published, versioned convention
  shared by several backends would justify a separately named adapter package.
  The CRUD _screen's_ interface (H4.2) is a different thing and does belong in
  ngkit. AIP + RFC, as pykit's `api-conventions.md` applies them, is that
  published convention, so the "dialect" objection does not apply to it:
  `@rn-forge/ng/crud` ships `standardDataSource()` for it (H4.3, decided
  2026-09-23). Other conventions still adapt in the app.

## H3 — Core correctness

Separate changes with focused tests.

### H3.1 — Safe browser storage — completed 2026-09-23

**Why a hand-rolled wrapper (principle #1, checked on npm 2026-09-23).**
`ngx-webstorage` 22.0.0 is maintained, but `retrieve()` returns `any` with no
validation, it reports no failure result, and it JSON-encodes every value. That
would break raw-string keys that a pre-bootstrap script reads (such as a theme
key). `@ngx-pwa/local-storage` is async IndexedDB, which is a different
model. Nothing maintained covers explicit failure results over the Web Storage
API, so the wrapper stays in ngkit. Put this justification in the class doc
comment.

**Files.**

- `libs/ng/core/src/lib/core.services.ts`: the token, types and methods below.
- `core.services.spec.ts`: the tests below.
- `libs/ng/README.md`: a "Storage" section.
- `tools/scripts/verify-consumer.mjs`: the smoke test's `Injector.create`
  adds `{ provide: RNF_BROWSER_STORAGE, useValue: globalThis.localStorage }`.
  A plain injector has no `DOCUMENT` and doesn't run root-scoped factories.
- `docs/plans/ngkit-agent-guide.md` §5.1: one line naming the `try*` methods.

Out of scope, and not to be edited:

- `libs/ng/auth/**` and `libs/ng-bootstrap/**`. They keep the strict methods on
  purpose, so a failed auth-token write still throws rather than silently
  succeeding.
- The E2 theme controller.

**Public surface** (exported through the existing `core.services.ts` →
`src/index.ts` barrel; no new entry point):

```ts
/** The Web Storage backing LocalStorageService; null when unavailable (SSR, blocked). */
export const RNF_BROWSER_STORAGE = new InjectionToken<Storage | null>('RnForgeBrowserStorage', {
  providedIn: 'root',
  factory: () => {
    try {
      // DOCUMENT from @angular/core. The getter can throw SecurityError.
      return inject(DOCUMENT).defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  },
});

export type StorageFailureReason =
  | 'unavailable' // token is null
  | 'security' // DOMException name 'SecurityError'
  | 'quota' // DOMException name 'QuotaExceededError' or 'NS_ERROR_DOM_QUOTA_REACHED'
  | 'malformed' // stored text is not valid JSON
  | 'invalid' // parsed JSON rejected by the caller's validator
  | 'unserializable' // JSON.stringify threw (cycle, BigInt) or returned undefined
  | 'unknown'; // anything else

export type StorageReadResult<T> =
  | { readonly status: 'found'; readonly value: T }
  | { readonly status: 'missing'; readonly value: T } // value is the fallback
  | {
      readonly status: 'failed';
      readonly value: T; // value is the fallback
      readonly reason: StorageFailureReason;
      readonly error?: unknown;
    };

export type StorageWriteResult = { readonly ok: true } | { readonly ok: false; readonly reason: StorageFailureReason; readonly error?: unknown };
```

New methods on the existing `LocalStorageService` never throw:

| Method                                                                                              | Returns                     |
| --------------------------------------------------------------------------------------------------- | --------------------------- |
| `tryGet(key: string, fallback: string): …`                                                          | `StorageReadResult<string>` |
| `tryGetJSON<T>(key: string, options: { validate: (value: unknown) => value is T; fallback: T }): …` | `StorageReadResult<T>`      |
| `trySet(key: string, value: string): …`                                                             | `StorageWriteResult`        |
| `trySetJSON(key: string, value: unknown): …`                                                        | `StorageWriteResult`        |
| `tryRemove(key: string): …`                                                                         | `StorageWriteResult`        |

The result shape is chosen so the common call is one line,
`storage.tryGetJSON('lastVisit', { validate: isVisitRecord, fallback: null }).value`,
while callers that must react to a failure can inspect `status` or `ok`.
`validate` is required, so there is no cast from `{}` or `unknown` to `T`.

**Rules.**

1. Inject `RNF_BROWSER_STORAGE` once. No method may reference the global
   `localStorage`.
2. Key format stays `${appName}.${key}`, unchanged, so existing persisted data
   keeps working.
3. The existing strict methods (`get`, `getJSON`, `set`, `setJSON`, `remove`,
   `clearAll`) keep their signatures and semantics. The one change: when the
   token is `null`, they throw
   `Error('[rn-forge.ng.core] Browser storage is unavailable …')` instead of a
   `ReferenceError`/`TypeError`. The existing spec cases must pass unchanged.
4. `clearAll()` enumerates keys with the standard `storage.length` /
   `storage.key(i)`, collecting them before removing, instead of
   `Object.keys(localStorage)`. That lets a fake `Storage` work, and removal
   can't skip entries. It removes only keys starting with `${appName}.`.
5. Classify errors in one private function. Check `error.name`, never
   `instanceof DOMException` (jsdom and browsers differ).
6. No console output. No new dependencies.

**Tests** (Vitest + TestBed). Use a small in-spec fake `Storage` class
(`Map`-backed, with switchable throwing on `getItem` and `setItem`), supplied
with `{ provide: RNF_BROWSER_STORAGE, useValue: … }`. No real sleeps.

- Token factory:
  - Returns jsdom's `localStorage` by default.
  - Returns `null` when `DOCUMENT.defaultView` is `null` (SSR).
  - Returns `null` when the `localStorage` getter throws `SecurityError`.
    Provide a fake `DOCUMENT` whose `defaultView` has a throwing getter.
- `null` storage:
  - Every `try*` method returns `unavailable` with the fallback.
  - Every strict method throws the `[rn-forge.ng.core]` error.
- Reads:
  - `found`.
  - `missing` returns the fallback.
  - `getItem` throwing `SecurityError` gives `failed/security`.
  - Malformed JSON gives `failed/malformed`.
  - Validator rejection gives `failed/invalid`.
  - A stored JSON `null` is found only when `validate` accepts `null`.
- Writes:
  - `ok`.
  - `setItem` throwing `QuotaExceededError` gives `quota`, and the
    Firefox-named variant maps the same way.
  - A cyclic object gives `unserializable`.
  - `trySetJSON(undefined)` gives `unserializable`.
  - `tryRemove` success, and `tryRemove` failure.
- Namespace isolation:
  - Two `TestBed` configurations with appNames `app` and `app-admin`
    share one fake `Storage`. Neither reads the other's keys.
  - `clearAll` on `app` leaves `app-admin.*` and unprefixed keys intact.

**Acceptance.** Run all of these. Record the output in the completion record.
`ng` coverage stays at or above the enforced 80% (currently about 89/86/95/92).

```sh
pnpm nx run-many -t lint test build --projects=ng,ng-bootstrap,ng-demo
pnpm nx run-many -t pack --projects=ng,ng-bootstrap
node tools/scripts/verify-dist-manifests.mjs
pnpm nx run ng:verify-consumer   # all four Angular 22.0/22.1 × zone/zoneless cells
```

**Done.** Implemented as specified, no deviations. Verification output:

- `pnpm nx run-many -t lint test build --projects=ng,ng-bootstrap,ng-demo`:
  all pass. `ng` coverage 89.85%/87.65%/96.09%/92.45% (statements/branches/
  functions/lines), 273 tests passing (12 files).
- `pnpm nx run-many -t pack --projects=ng,ng-bootstrap`: both tarballs built.
- `node tools/scripts/verify-dist-manifests.mjs`: passed for `ng`, `ng-bootstrap`.
- `pnpm nx run ng:verify-consumer`: passed for all four Angular 22.0/22.1 ×
  zone/zoneless cells.

### H3.2 — Core items — completed 2026-09-23 (CRUD → H4, Auth → H5)

Implemented in `libs/ng/core` (five core items). CRUD moved to H4
and Auth to H5; neither was fixed in place:

- **DateUtil:** added `isoFormatUtc`, `fromTimestampLocal`, `diffDateLocal`
  (calendar-day, DST-safe) and `isValidDate`. Existing methods keep their
  semantics; docs now say which are local and which UTC. Leap-day and DST tests added.
- **FormUtil (breaking, in place — decided 2026-09-23):** validators now run on
  pristine non-empty values (no `dirty` gate); empty means `null`/`undefined`/`''`
  so `0` is a value; zero `min`/`max`/`decimalPlaces` are honoured; `DATE` rejects
  impossible calendar dates and `notBefore`/`notAfter` offsets use local days.
  `DATE_RANGE(start?, end?)` is now a pure group `ValidatorFn` (attach via the
  group's `validators`) reporting `{ dateRange }`; the old
  `DATE_RANGE(formGroup, …)` subscription form is removed. Needs a breaking-change
  note in the next release.
- **ObjectUtil.diff:** scalars compare by strict equality (numbers, `0`/`1`,
  `false`/`true`, `null` vs value now conflict; `null`≡`undefined`); arrays and
  `Date`s compare structurally; array vs object conflicts; missing key vs
  `undefined` is distinguished. Local `isEmpty` removed.
- **HtmlAttributesDirective:** now `ngOnChanges`; re-applies on change and removes
  only attributes it set that are absent from the next map (Renderer2).
- **Routing:** `RouteService.navigateByUrl(url, extras?)` merges caller
  `NavigationExtras` over the old defaults (`reload`, `replaceUrl: true`);
  existing calls are unchanged.

Evidence: `pnpm nx test ng` (305 passed), `pnpm nx run-many -t lint,build -p ng`.

### H4/H5 owner decisions

1. **Browser client or BFF (H5.4).** Open. Default: browser client + PKCE,
   BFF-ready.
2. **`ng-bootstrap/crud` during H4.** Decided 2026-09-23: rewritten on the new
   controller in H4.5 step 6, not kept alongside it; `ng-demo` depends on it.
3. **Forward H4.7 (`Content-Disposition`) and H5.5 (R6 identity-provider
   views) to pykit.** Default: yes, as notes in the pykit plan's R7 and R6.

## H4 — Standard resource screen (planned 2026-09-23)

### H4.1 — Authority and premise

The CRUD screen is a client of **the wire contract**, not of pykit. pykit's
premise is that a consumer cannot tell from the wire whether a service was
built with pykit, the native frameworks or another stack. The screen therefore
targets the standards that `pykit:packages/rn-forge-web/docs/adoption/api-conventions.md`
applies, and works against any backend that follows them. Order of authority
(README principle 1): published standard (RFC, then AIP where no RFC applies) →
Angular's own mechanism → an ngkit wrapper.

**Do not wait on pykit.** Everything the screen depends on is already decided
there; what remains open (R4 model types, R5 library evaluations, R9
persistence) is server-side only:

| UI concern                 | Standard                                                                                                                                                                                                 | pykit status (2026-09-23)     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| List and pagination        | AIP-158: `pageSize`, `pageToken` → `items`, `nextPageToken` (`null` on last), `totalSize` opt-in                                                                                                         | Done, `api-conventions.md` §4 |
| Sorting                    | AIP-132 `orderBy` (`name desc,createTime`), allow-listed; a changed order with an old token is 400                                                                                                       | R8, "Adopt"                   |
| Filtering                  | Per-field query parameters (AIP-160's filter language rejected)                                                                                                                                          | Decided, R8                   |
| Errors and validation      | RFC 9457 problem+json; `errors[].{pointer, detail}`                                                                                                                                                      | Done, R2                      |
| Update and concurrency     | `PATCH` = RFC 7396 merge patch; `ETag` + `If-Match` → 412                                                                                                                                                | Done, §3 and §10              |
| Create retries             | `Idempotency-Key` (IETF draft); same key + different body 422, in flight 409                                                                                                                             | Done, R2 and B10              |
| Delete                     | 204; already absent is 404                                                                                                                                                                               | Done, §10                     |
| Export                     | `GET` collection with `Accept: text/csv` or xlsx; `?format=` fallback; `Content-Disposition` with `filename*` (RFC 6266/8187)                                                                            | R7 wire table                 |
| Import and template        | `POST …:import` multipart `file`, `?validateOnly=true` (AIP-163) → `{created, updated, skipped, validateOnly}`; row errors 422 with `pointer = /rows/12/Quantity`; `GET …:importTemplate[?prefill=true]` | R7 wire table                 |
| Bulk                       | `:batchCreate` `{requests}` (AIP-233); `:batchDelete` `{ids}` → 204 (AIP-235); all or nothing                                                                                                            | R7 wire table                 |
| Field names and timestamps | camelCase; RFC 3339 UTC (AIP-142)                                                                                                                                                                        | Done §8; AIP-142 in R8        |

Open pykit items that touch the UI, none of them blocking:

- **R7 Q1, import failure default.** All or nothing (422, nothing saved) is the
  spec; partial save (200 with errors listed) is the one sanctioned variant.
  The screen handles both.
- **R7 Q2, export over the row cap.** Render whatever problem arrives; no
  status-specific branch.
- **R8 AIP-148 field names** (`createTime` vs `createdAt`). Affects only how the
  app configures audit columns; nothing in ngkit names them.

### H4.2 — Data-source contract (replaces the current `CrudDataSource`)

A breaking replacement. Names follow the AIP standard and custom methods, so a
generated client's `operationId`s (`ordersList`, `ordersBatchDelete`,
`ordersImport`) map one-to-one.

- `list(request: ListRequest)` → `Observable<ListResponse<$S>>`, where
  `ListRequest = { pageSize?, pageToken?, orderBy?, filter?: Record<string, …> }`
  and `ListResponse<T> = { items: T[]; nextPageToken: string | null; totalSize?: number }`.
- `get(id)`, `create(payload, { idempotencyKey? })`,
  `update(id, patch, { etag? })`, `delete(id)`. `get`, `create` and `update`
  return `Versioned<$S> = { value: $S; etag?: string }`, so the screen can send
  the `ETag` it read back as `If-Match` without parsing headers itself.
- Optional, feature-detected by the screen (absent method → action hidden):
  `batchDelete(ids)` → `void`; `import(file, { validateOnly })` →
  `ImportReport`; `importTemplate(filter, { prefill })` and
  `export(format, filter)` → `{ blob, fileName }`.
- Errors pass through unchanged as `HttpErrorResponse` (README wrapper rule).
  The screen reads RFC 9457 bodies from them; it defines no error envelope.
- `$K extends string | number` stays. `WriteModel`/`ReadModel` keep only `id`.
- Remove `count`/`next`/`previous`/`results`, `BulkDeleteResponse`,
  `UploadResponse` and `upload(fieldName)`.
- **Legacy backends adapt in the app.** CIMS's DRF envelope and `ew-loop-api`'s
  pre-pykit endpoints map into this contract inside their own data-source
  implementation. ngkit ships no DRF adapter.
- **Standard backends use `standardDataSource()`** (H4.3). An app with a
  generated client may implement the contract over it instead.

### H4.3 — Package split

Presentation-free state and behaviour go into `ng` now (README principle 3), so
a presentation library only renders. `ng-bootstrap/crud` and a future
`ng-tailwind/crud` wrap the same controller.

- **New `@rn-forge/ng/crud` entry point** (decided 2026-09-23). It holds
  everything that talks to the wire standards in H4.1, and nothing visual. It
  targets the standards, not pykit: it must work against any backend that
  follows them (H2R.0). It contains:
  - the H4.2 contract and types, moved out of `ng-bootstrap/crud`;
  - a list controller built on Angular `resource()`: page-token stack
    (previous/next, reset on `orderBy` or filter change), `orderBy` state,
    selection keyed by `$K`, latest-request-wins;
  - `problemToFormErrors(problem, form)`: maps RFC 9457 `errors[].pointer`
    (JSON Pointer, RFC 6901) to controls, with unmatched entries as a form-level
    error. **Check npm first** for a maintained mapper; hand-roll only per the
    README exemptions and say which one applies;
  - conflict handling: 412 → a `conflict` state the screen renders as
    reload-and-reapply;
  - `standardDataSource(config)`: the `CrudDataSource` implementation for any
    backend following the H4.1 table, over native `HttpClient` (H2R.3). See
    below;
  - `fileNameFrom(response: HttpResponse<Blob>)`: reads `Content-Disposition`
    through the `content-disposition` package's `parse()` (jshttp, 3.0.0,
    2026-08, ESM, no dependencies; RFC 6266 + RFC 8187 `filename*`). It becomes
    a `dependency` of `ng` via `allowedNonPeerDependencies`. Don't hand-roll
    the parser.
- **`standardDataSource()`** (decided 2026-09-23; revisit if usage drifts
  across apps). Called in an injection context, like `inject()`:

  ```ts
  readonly dataSource = standardDataSource<Order, OrderInput, string>({
    baseUrl: inject(ORDERS_API_URL), // app-owned token, H2R.3
    collection: '/orders',
    features: { batchDelete: true, import: true, export: ['text/csv'] },
  });
  ```

  Wire mapping, exactly the H4.1 table and nothing else:

  | Method           | Request                                                                                                   |
  | ---------------- | --------------------------------------------------------------------------------------------------------- |
  | `list`           | `GET {collection}?pageSize&pageToken&orderBy&<filter params>`                                             |
  | `get`            | `GET {collection}/{id}`; `ETag` → `Versioned.etag`                                                        |
  | `create`         | `POST {collection}`; `Idempotency-Key` when given                                                         |
  | `update`         | `PATCH {collection}/{id}`, `Content-Type: application/merge-patch+json`; `If-Match` when an etag is given |
  | `delete`         | `DELETE {collection}/{id}`                                                                                |
  | `batchDelete`    | `POST {collection}:batchDelete` `{ ids }`                                                                 |
  | `import`         | `POST {collection}:import[?validateOnly=true]`, multipart `file`                                          |
  | `importTemplate` | `GET {collection}:importTemplate[?prefill=true]` + filter params                                          |
  | `export`         | `GET {collection}` + filter params, `Accept: <format>`, `observe: 'response'`, `responseType: 'blob'`     |

  Rules:
  - Optional methods exist on the returned object only when `features` enables
    them, so the screen's feature detection hides the rest.
  - `baseUrl` and `collection` are required; a missing one fails with
    `[rn-forge.ng.crud]` (README wrapper rule). Ids are path-encoded with
    `encodeURIComponent`. No slash normalization (H2R.0).
  - Filter params drop `undefined`, repeat array values (`form`/`explode`),
    and go through `HttpParams`.
  - No retries, caching, error mapping or `catchError`: `HttpErrorResponse`
    passes through unchanged. Interceptors and tracing stay the app's (H2R.3).
  - File responses return `{ blob, fileName }` via `fileNameFrom`.
  - Nothing names or detects pykit; any standards-following backend works.

- **Saving a file stays `AppUtil.saveBlob`** in `ng/core`. It is not wrapped
  around `file-saver`: checked on npm 2026-09-23, `file-saver` 2.0.5 was last
  released 2020-11 and its repository last pushed 2023-03. The needed slice is
  six lines of anchor + object-URL glue, which is README exemption 3
  (unmaintained candidate, few-line slice). Record that in the `saveBlob` doc
  comment. Don't add a second save helper.
- **`ng-bootstrap/crud`** renders the controller: table, forms, delete modal,
  import dialog. It keeps no data logic.
- **`ng-tailwind`** (T-series) gets its own renderer later, over the same
  controller.

### H4.4 — UX consequences (required, not options)

- **No numbered pages, and no total by default.** Next/previous (token stack) or
  "load more". Show `totalSize` only when the backend sends it. The current
  table's client-side `limit=2000` scroll is removed.
- **Column sort writes `orderBy`**; only columns the app marks sortable, since
  the server allow-lists them.
- **Filters are named query parameters** the app declares; no expression
  builder.
- **Server validation lands on the form** through `problemToFormErrors`.
- **412 on save** offers reload; it never silently overwrites.
- **Import is two steps.** Upload with `validateOnly=true`, show the report or
  422 row errors, then commit. Handle the partial-save 200 variant (R7 Q1).
- **Export is a `GET` download** (`Accept` negotiation), not `POST …/download`.
- **Create sends an `Idempotency-Key`** (a UUID per submit attempt, reused on
  retry) when the data source accepts one.

### H4.5 — Implementation steps (incremental; stop after step 7)

One step per change, each green on its own checks before the next begins. Read
`CLAUDE.md`, `README.md` (Design principles) and this section first. Invoke the
`nx-generate` skill before scaffolding. Don't commit, release or touch
`nx.json`/workflows unless the step says so.

1. **Entry point and contract.** Scaffold `libs/ng/crud` (mirror `libs/ng/core`:
   `ng-package.json`, `src/index.ts`, `tsconfig.base.json` path, `ng` test
   include and `coverageInclude`). Add the H4.2 types and `CrudDataSource`
   interface. Add `./crud` to `verify-consumer.mjs`'s entry-point matrix.
   `ng-bootstrap/crud` is untouched in this step.
   Checks: `pnpm nx run-many -t lint test build -p ng`, `pnpm nx run ng:verify-consumer`.
2. **List controller.** `createCrudList()` (or an injectable; decide in the
   step and say why) on Angular `resource()`: page-token stack, `orderBy`,
   declared filters, `pageSize`, selection keyed by `$K`, `reload()`,
   latest-request-wins. Tests: next/previous across three pages, reset on
   `orderBy` and filter change, a delayed older response never overwrites a
   newer one, selection survives reload only for ids still present,
   `totalSize` absent vs present.
3. **Errors and conflicts.** `problemToFormErrors(problem, form)` per H4.3
   (check npm first; name the exemption if hand-rolled); 412 → `conflict`
   state. Tests: nested and array-index pointers, unmatched entries as
   form-level error, non-problem bodies ignored, 412 vs other 4xx.
4. **Files and write helpers.** `fileNameFrom()` over `content-disposition`
   (add the dependency and `allowedNonPeerDependencies` entry); `saveBlob` doc
   comment per H4.3; `Idempotency-Key` generation (`crypto.randomUUID()`, one
   per submit attempt, reused on retry); optional-method feature detection.
   Tests: RFC 8187 `filename*`, quoted fallback, missing header, both present
   (`filename*` wins); key reuse on retry and renewal on a new submit.
5. **`standardDataSource()`.** Per H4.3. Tests with `HttpTestingController`:
   the exact method, URL, params, headers and body for every row of the wire
   table; id encoding; array and `undefined` filter params; `ETag` read into
   `Versioned` and sent back as `If-Match`; merge-patch content type;
   `Idempotency-Key` only when given; optional methods absent unless enabled;
   a 412/422 `HttpErrorResponse` reaching the subscriber unchanged; the missing
   config error.
6. **`ng-bootstrap/crud` renderer.** Rewrite `AbstractCrudManager` and
   `CrudComponent` over the controller: token paging (H4.4, no numbered pages),
   sortable columns writing `orderBy`, declared filters, create/update/delete
   with `problemToFormErrors`, the 412 reload offer, batch delete when present.
   Delete the old types. No data logic stays in `ng-bootstrap`.
   Checks: `pnpm nx run-many -t lint test build -p ng,ng-bootstrap`.
7. **Import, export and demo.** Two-step import (`validateOnly`, report or 422
   row errors, commit; handle the partial-save 200), `GET` export and template
   download through `fileNameFrom` + `saveBlob`, hidden when absent. Rewrite
   `apps/ng-demo` `products` on `standardDataSource()`, and its mock `/api` to
   speak the H4.1 wire table;
   update the `ng-demo-e2e` spec. Update `libs/ng/README.md`,
   `libs/ng-bootstrap/crud/README.md` and `ngkit-agent-guide.md` §5.8.
   Checks: `pnpm nx run-many -t lint test build -p ng,ng-bootstrap,ng-demo`,
   `pnpm nx e2e ng-demo-e2e`, `pnpm nx run ng:verify-consumer`.

**Stop here** and review with the owner before H4.6/H4.7.

### H4.6 — Wire acceptance (after the step 7 review)

Unit, demo and e2e checks are part of the H4.5 steps.

- **Acceptance against the wire, not pykit internals:** run `ng-demo` e2e
  against a pykit `FastApiApp` fixture serving one full resource (list with
  `orderBy`, get, create, patch with ETag, delete, `:batchDelete`, `:import`,
  export). The existing conformance app `asgi_app.py` has only list/get/patch,
  so the fixture lives on the pykit side, and it needs pykit R7 (import,
  export, batch) and R8 (`orderBy`, `validateOnly`) first.
- Breaking-change note in the release: `CrudDataSource` and its types move to
  `@rn-forge/ng/crud` and change shape.

### H4.7 — Sent to pykit (owner to forward)

- **`EXPOSED_HEADERS` lacks `Content-Disposition`**
  (`pykit:packages/rn-forge-web/src/rn_forge/web/tracing.py`, checked
  2026-09-23). A cross-origin browser cannot read the export or template file
  name. Add it with R7, or document export as same-origin only.

## H5 — OIDC client auth (planned 2026-09-23)

### H5.1 — Why replace, not fix

`@rn-forge/ng/auth` is a custom layer:

- login is a custom `POST` returning snake_case `access_token`/`refresh_token`
  (the simplejwt `UserTokenView` exchange), not a standard grant;
- the JWT is kept in `localStorage`, readable by any XSS;
- `UserProfile` is a Django user (`is_staff`, `is_superuser`,
  `groups[].permissions`) decoded from a custom `profile` claim;
- the interceptor attaches the token to every URL except an ignore-list, so it
  can leak to other origins;
- 401/403 are checked on successful `HttpResponse` events, which Angular never
  delivers, and **403 sends the user to login**, contradicting pykit §7 (403 =
  authenticated but not allowed) and causing redirect loops.

### H5.2 — Roles, by standard

- **The identity provider signs users in.** An OAuth 2.0 / OIDC authorization
  server (Entra ID, Keycloak, Auth0, …). SSO and SAML federation happen at the
  identity provider, not in each API.
- **The API is a resource server.** It verifies bearer JWTs (RFC 6750, RFC 9068)
  through OIDC discovery and JWKS and answers 401 with a challenge / 403 without
  one. pykit already does this (`OidcAuthenticator`, `Principal`, §7).
- **The SPA is an OIDC client.** Authorization Code + PKCE (RFC 7636; RFC 9700
  OAuth 2.0 Security BCP; OAuth 2.1). No implicit flow, no password grant.
- **Basic auth** stays local-development and simple-internal only (pykit §7).
  The SPA does not offer it.

### H5.3 — ngkit surface

A thin wrapper (README principle 2) over a maintained library. Candidates on npm,
2026-09-23: `angular-auth-oidc-client` 22.0.1 (modified 2026-09-21, Angular
`>=20`) and `angular-oauth2-oidc` 22.0.2 (modified 2026-06-26, Angular `>=22`).
Recommended: `angular-auth-oidc-client`. Confirm its OpenID Foundation
certification, refresh-token rotation and allowlisted interceptor in the
implementing PR, and record the comparison.

- `provideRnForgeAuth(config)`: a readonly typed config (`authority`,
  `clientId`, `scopes`, `secureRoutes`, `forbiddenPath`) mapped onto the
  library's own. Missing required config fails with `[rn-forge.ng.auth]`. The
  library's service stays reachable (escape hatch).
- Tokens attach **only** to `secureRoutes` (allowlist). Remove
  `ignoreBackendURLs`.
- Functional `authGuard` (`CanMatchFn`) that starts login with a return URL.
- `hasScope()` / `hasRole()` signals and a structural directive, reading the
  standard `scope` claim and RFC 9068 `roles`/`groups`. **UI hints only**; the
  server's 403 is authoritative.
- Profile from OIDC `userinfo` standard claims (`sub`, `name`, `email`,
  `picture`). Remove `UserProfile`, `JwtCredentials`, the `profile` claim and
  `jwt-decode`.
- One error policy in the RxJS error channel: 401 → re-authenticate once (no
  loop), 403 → `forbiddenPath`, never login.
- Explicit no-auth mode for demos and tests (`provideRnForgeAuth(false)` or
  similar), documented as never for production. It replaces the implicit
  `disableAuth: true` default.
- **`ng-bootstrap/auth`**: the login page is removed (the identity provider owns
  it). Keep a signed-in user menu and a forbidden page. User, group and
  permission screens are H4 resource screens, or the identity provider's admin.

### H5.4 — Owner decision: browser client or BFF

- **Browser client (recommended start):** PKCE public client, tokens in memory,
  rotating refresh tokens. Needs no new backend; pykit already validates the
  tokens.
- **BFF (upgrade path):** a same-origin backend holds the tokens and the browser
  holds only an HttpOnly session cookie. The IETF "OAuth 2.0 for Browser-Based
  Applications" draft ranks it most secure, and H2R.3 already prefers a
  same-origin gateway. Needs a BFF component, which pykit does not have.
- Design H5 so a BFF is a drop-in: guards, `hasScope`/`hasRole` and the 401/403
  policy stay; the token source changes, and Angular's XSRF support
  (`withXsrfConfiguration`) covers the cookie.

### H5.5 — Sent to pykit (owner to forward)

- **R6:** the simplejwt login, token-exchange (`UserTokenView`) and SAML views
  make `rn-forge-django` an identity provider, against pykit's own premise. If a
  self-hosted identity provider is needed, adopt one (Keycloak,
  `django-oauth-toolkit`) instead of keeping those views.

### H5.6 — Verification

- Unit tests: tokens only on allowlisted URLs, never on
  others; 401 in the error channel → one re-auth, no loop; 403 → forbidden
  page, not login; refresh concurrency (parallel 401s trigger one refresh); no
  token in `localStorage`; explicit no-auth mode.
- Acceptance: `ng-demo` against a local Keycloak container (code + PKCE) calling
  a pykit `FastApiApp` protected by `OidcAuthenticator`: a missing token is 401,
  a missing scope is 403, and the UI hides actions without the scope.
- `pnpm nx run-many -t lint test build --projects=ng,ng-bootstrap,ng-demo`,
  `pnpm nx run ng:verify-consumer`; the new library is a `dependency` of `ng`
  declared in `allowedNonPeerDependencies`, or an optional peer if the auth entry
  point is situational (README principle 3; decide in the PR).
- Breaking-change note: the whole `@rn-forge/ng/auth` surface.

## E1 — Asynchronous resource (depends on H1)

New `libs/ng/resource/` secondary entry point (reconcile it with H4's
`@rn-forge/ng/crud`). Check first whether Angular's `resource()`/`httpResource()`
already covers the need (README principle 1); this wraps it only for the
loading-UX timings and error classification it lacks.

Proposed contract:

```ts
createAsyncResource<R, T, E>({
  request: () => R | undefined,
  loader: (request: R) => Observable<T>,
  refresh?: () => unknown,
  classifyError: (error: unknown) => E,
  preservePrevious: boolean,
  timings: { skeleton: number, slow: number, stalled: number, timeout: number }
})
```

Return readonly signals `status: idle|loading|ready|error`, `value`, `error`,
`showSkeleton`, `slow`, `stalled`, `refreshing`, and `reload()`. Explicit
undefined request is disabled/idle and cancels prior work. Value retention on a
changed key is controlled by `preservePrevious`; state this explicitly.

Requirements:

1. No app types: error classification and refresh are callbacks.
2. Use a teardown owned by DestroyRef. Cancel subscription and all timers on
   new request, disabled request and destruction. Guard against stale results.
3. Invoke loader through defer or equivalent to classify synchronous throws.
   Define one-shot semantics: first value completes; empty completion becomes a
   documented error, never permanent loading. Reset error metadata at each new
   attempt.
4. Default timing values may be 300/1000/10000/30000 ms; validate ordering and
   permit configuration. No HTTP or product copy in the timing mechanism.
5. Fake-timer tests: fast response; each threshold; retry; retained value;
   changed key; error then success; one error then an unrelated error (no
   leftover metadata); disable while pending; destroyed resource; stale late
   emission; synchronous throw; empty completion. No real sleeps. Confirm
   cancelled timers do not mutate state.

## E2 — Theme controller (depends on H1 and H3.1; coordinate CIMS ColorModeService)

One shared service/API, not both a ThemeService and a ColorModeService. Proposed
`provideRnForgeColorMode({ storageKey, attribute, modes })`, signal mode with
`system|light|dark`, set/cycle; adapt CIMS's proposed auto spelling at its boundary.
Allow class-based output only if a consumer requires it. Keep default
configuration neutral and documented; the app supplies its storage key.

Inject DOCUMENT and `RNF_BROWSER_STORAGE`; tolerate absent browser, blocked
storage and invalid values. Apply persisted choice at initialization. System
removes explicit attribute and stored override; CSS follows OS. Provide a
configurable pre-paint snippet with identical key/attribute, since Angular
startup cannot prevent a theme flash. No app fonts, brand CSS or logos.

Acceptance: initialization stamping, SSR construction, blocked remove as well as
get/set, stored dark before bootstrap, system following OS, explicit light over
dark OS, print remaining light.

## T1 — New `@rn-forge/ng-tailwind` package (depends on H1)

Before scaffolding invoke the nx-generate skill; discover generator schema,
do not guess CLI flags. Mirror library packaging patterns, not Bootstrap imports.

Files to create: `libs/ng-tailwind/{package.json,ng-package.json,project.json}`,
public index, component sources/specs/stories, assets, README, demo integration.
Use standalone signal-input OnPush components. Angular/CDK are framework peers;
ng is a same-release peer only for actual shared behavior use.

CSS distribution decision: ship prebuilt, scoped component CSS with neutral
namespaced semantic tokens and a separately exported optional Tailwind v4 bridge.
Consumers must not scan node_modules or safelist dynamically composed utilities
to get functioning components. No preflight, global body resets, fonts, html
color scheme or forced brand palette. Plain Angular consumer also must render.

- Scope selectors to toolkit hosts/classes (`rnf-*`), not `.btn`, `.state`, etc.
- Define tokens for surface/text/muted/border/focus/success/warning/danger/neutral.
  An app maps its own tokens in one bridge; brand tokens and typography stay in
  the app. Document dark-mode and overlay inheritance.
- Verify token contrast using rendered/computed CSS, not copied constants.
  Choose contrast-verified (WCAG AA) defaults.
- Export assets in package.json, use the existing post-build exports patch pattern
  if ng-packagr requires it, and verify imports from the packed artifact.
- Add new library to nx.json release.projects and preVersionCommand. Set both
  source and dist manifestRootsToUpdate, dist preserveLocalDependencyProtocols
  false. Mirror metadata (description/license/repository/publishConfig) and dryRun
  publishing policy. Pack must consume version-stamped dist without rebuilding.
- Extend release pack/upload and CI package verification for the third artifact;
  plan these config changes separately under repository approval rules.
- Add docs API entry and Storybook/examples without replacing Bootstrap's docs.

## T2 — Presentation primitives (depends on T1)

One component family per review:

1. StatusBadge: `tone: success|warning|danger|neutral`, required visible label,
   optional description and `appearance: default|bare`. The app maps its own
   status type to a tone; the badge imports no domain type.
2. EmptyState: projected icon/content/actions with neutral layout. The app
   supplies the prose and icon.
3. StateBlock: heading/description/action projection; no hard Router dependency.
   Consumers use a native link or button.
4. PageSkeleton: configurable line count and loading/stalled messages. Lines
   aria-hidden; no animation by default. Timings come from E1. No fixed copy;
   accessible status announcement.
5. ThemeToggle: controlled mode input and change output, configurable accessible
   labels; it need not inject a global controller.

Test light/dark, reduced motion, forced colors, visible text and native action
semantics. Production consumer CSS must work without source scanning.

## T3 — Connected menu (depends on T1)

Build on CDK Menu and overlay positioning: a generic trigger plus projected menu
items, and an optional scoped exclusivity controller if CDK does not cover
one-open-at-a-time behavior. Menu item models stay in the app.

Acceptance browser cases: keyboard open, ArrowUp/Down, Home/End, typeahead,
Escape returning focus, trigger toggled twice, switching triggers, outside click,
route navigation and destroyed trigger. Clicking another focusable control must
not steal focus back to the old trigger. Links preserve query parameters and
fragments. Test overlay placement near the viewport edge and inherited theme
tokens.

## Delivery sequence and evidence

H1 ✓ → H2R ✓ → H3.1 ✓ → H3.2 ✓ (2026-09-23) → **H4 steps 1–7 (next)** → owner
review → H4.6 and the order of the rest (H5, E1/E2, T1–T3). H4 doesn't wait on
pykit; its wire acceptance (H4.6) and the H4.7/H5.5 feedback are pykit-side.
E1's entry point is reconciled with `@rn-forge/ng/crud` when E1 is taken up. T
work that renders a CRUD screen builds on the H4 controller. Each PR must name its source files, public exports and test evidence.
No vague 'implement shared UI' tasks.

Library checks: inspect resolved Nx targets with `pnpm nx show project <name>
--json`; run the relevant library lint/test/build/pack via Nx. For each new
published entry point, add it to `ng:verify-consumer`'s matrix and test exports,
peer resolution and runtime styles from the packed tarball. Confirm the
`ng-demo` app still builds after core changes. Never run a release/publish as a
validation shortcut.

Coverage: `ng`'s test target enforces 80% statements/branches/functions/lines
across `core` and `auth`. New code must clear it without lowering the
thresholds.

## Completion record

H1 is complete in ngkit (this repository):

- Angular peers for `ng` and `ng-bootstrap` widened from `~22.0.6` to
  `^22.0.6` (`@angular/common`, `@angular/core`, `@angular/forms`,
  `@angular/router`; `ng-bootstrap` also for `@angular/cdk`'s existing `^22.0.4`
  and `@angular/localize`'s existing `^22.0.6`, left as-is since both were
  already caret ranges spanning the tested versions). ngkit has no external
  consumers yet, so a plain caret range (rather than a hand-built
  `>=22.0.6 <23` bound) is sufficient and stays idiomatic. `@rn-forge/ng`'s
  `workspace:*` peer on itself in `ng-bootstrap` is unaffected by this change.
- `ObjectUtil.diff`'s `isEmpty` (`libs/ng/core/src/lib/core.utils.ts`) is now a
  local helper instead of a `lodash-es` import; it deliberately preserves
  lodash's existing scalar-as-empty semantics rather than fixing them here
  (tracked in H3). `lodash-es` is no longer imported anywhere in `core`.
- `lodash-es`, `build-url-ts` and `jwt-decode` (all `auth`-only now) moved from
  `ng`'s `peerDependencies` to `dependencies`, declared via
  `allowedNonPeerDependencies` in `libs/ng/ng-package.json`. `@angular/forms`
  and `@angular/router` remain mandatory peers of the whole package (`FormUtil`,
  `RouteService`). `ng-bootstrap`'s own broader `lodash-es` peer is untouched —
  it is used directly across several of its components, not just an
  implementation detail of one sub-feature.
- New `tools/scripts/verify-consumer.mjs`, run via the `ng:verify-consumer` nx
  target (`dependsOn: ["pack"]`) and wired into `ci.yml`'s `package` job. It
  installs the packed `@rn-forge/ng` tarball via `file:` into four throwaway
  fixtures under `dist/consumer-fixtures/` (outside the pnpm workspace glob),
  pinning Angular 22.0.6 and 22.1.7, each with and without `zone.js` loaded,
  and smoke-tests every secondary entry point (`.`, `./core`, `./http`,
  `./http/crud`, `./auth`) plus a `LocalStorageService` round-trip through DI.
  It also asserts the installed manifest carries no `workspace:` protocol
  dependency. No verdaccio; no fixture added to `pnpm-workspace.yaml`. Verified
  locally: all four matrix cells pass.
- Found and fixed a real packaging bug while wiring the above: plain `nx pack`
  (the path `ci.yml`'s `package` job uses) never runs `nx release version`, so
  `ng-bootstrap`'s dist `package.json` still carried a literal
  `"@rn-forge/ng": "workspace:*"` peer — unresolvable by an external `npm`/`pnpm
install`. New `tools/scripts/resolve-dist-workspace-deps.mjs` rewrites any
  `workspace:` protocol dependency in a dist manifest to the referenced local
  package's current version, wired into `ng-bootstrap`'s `pack` target ahead of
  `npm pack`. It is a no-op once `nx release version` has already stamped an
  exact pin, so the real release path (which pre-stamps before packing) is
  unaffected. `tools/scripts/verify-dist-manifests.mjs` is now also run from
  `ci.yml`'s `package` job (previously `release.yml` only), and passes for both
  packages after this fix.
- `pnpm exec nx run-many -t lint test build --projects=ng,ng-bootstrap,ng-demo`
  all pass. `ng`'s coverage: 88.05% statements / 83.43% branches / 94.11%
  functions / 90.79% lines — above the enforced 80% thresholds. Production
  `ng` and `ng-bootstrap` bundles contain no unexpected framework leakage (the
  only "bootstrap" hits in `ng`'s dist are the English word in
  `provideRnForgeCoreConfig`'s doc comments, e.g. "application bootstrap").

H2 + H2R are complete in ngkit (2026-09-23):

- `libs/ng/http/**` (including `/http/crud`) is deleted, with no aliases. Removed
  with it: the `tsconfig.base.json` path, the `ng` test include and
  `coverageInclude` entries, `RnForgeCoreConfig.apiBasePath`, and the
  `./http`/`./http/crud` cells in `verify-consumer.mjs`. `rg` finds no remaining
  import of `@rn-forge/ng/http`, `OpenApiHttpService`, `HttpUtil`,
  `DownloadResponse` or `apiBasePath` outside `docs/plans/`.
- `AuthBackendService` injects `HttpClient` and builds
  `${backend.baseUrl}${authApiRoot ?? '/auth'}${loginPath ?? '/login'}` (and the
  same for logout).
  **Deviation:** `backend.baseUrl` is optional in the `AuthBackendConfig` type,
  because the rest of `RnForgeAuthConfig` works without it. The service
  enforces it instead: construction throws `[rn-forge.ng.auth] … backend.baseUrl
is not configured` when it is `undefined`, and `''` is accepted as the
  current origin. A URL is still never built from `undefined`, and apps
  that don't render `AuthComponent` don't need it.
- `@rn-forge/ng-bootstrap/crud` exports `CrudDataSource<$Q, $S, $K>`,
  `WriteModel<$K>`, `ReadModel<$K>`, `ListResponse`, `BulkDeleteResponse`,
  `UploadResponse` and `CrudFileDownload`. `AbstractCrudManager` takes
  `abstract get dataSource()` and a protected `errorMessage(err)` hook.
  **Deviation:** `CrudDataSource` has only the seven methods the manager calls:
  `list`, `create`, `update`, `bulkDelete`, `upload`, `uploadTemplate` and
  `download`. There is no single-item `read` or `delete`, exactly the
  methods the manager calls.
- `AppUtil.saveBlob(blob, fileName)` has been added to `@rn-forge/ng/core`.
- The demo's `products` resource is a `CrudDataSource` over `HttpClient`, with an
  app-owned `DEMO_API_URL` token (`apps/ng-demo/src/app/shared/api.tokens.ts`).
- The H2R.3 guidance is in `libs/ng/README.md` (HTTP section),
  `libs/ng/auth/README.md`, `libs/ng-bootstrap/crud/README.md` and
  `ngkit-agent-guide.md` §5.3/§5.8.
- **Fixed during review:** the Angular peers of `ng` and `ng-bootstrap` had
  drifted to `^22.1.7` when the workspace moved to 22.1.7. That excluded Angular
  22.0, which H1 supports, and failed both 22.0 cells of `ng:verify-consumer`
  (`ERESOLVE … peer @angular/common@"^22.1.7"`). The peers are back to `^22.0.6`,
  and devDependencies stay at `^22.1.7`. Bump a peer floor only on purpose,
  together with the matrix.
- Evidence (2026-09-23):
  - `pnpm nx run-many -t lint test build --projects=ng,ng-bootstrap,ng-demo`
    passes. `ng` ran 245 tests with coverage of 89.6% statements, 86.75%
    branches, 95.79% functions and 92.62% lines. `ng-bootstrap` ran 150 tests
    and `ng-demo` ran 14.
  - `pnpm nx run-many -t pack --projects=ng,ng-bootstrap` passes.
  - `node tools/scripts/verify-dist-manifests.mjs` passes for both packages.
  - `pnpm nx run ng:verify-consumer` passes all four Angular 22.0.6/22.1.7 ×
    zone/zoneless cells.

H4.5 steps 1–7 are complete (2026-09-23), uncommitted, for owner review before
H4.6. Notes, deviations and evidence:

- **`@rn-forge/ng/crud`** (`libs/ng/crud`): contract and types, `createCrudList()`
  (a function on `rxResource`, not an injectable: the data source belongs to one
  screen, so nothing is shared through DI), `problemToFormErrors()` +
  `crudErrorKind()`, `fileNameFrom()` (over `content-disposition` 3.0.0, added to
  `ng` `dependencies`, `allowedNonPeerDependencies` and the root `package.json`
  like the other implementation libraries), `IdempotencyKey`, `crudFeatures()`,
  `standardDataSource()`.
- **`problemToFormErrors` is hand-rolled** under README exemption 1: npm searched
  2026-09-23, no maintained package maps RFC 9457 pointers onto Angular forms.
  The pointer parse is a few lines, so it takes no JSON Pointer dependency.
  Errors are set as `{ server: string[] }` on controls and the form.
- **`saveBlob`** stays hand-rolled; the doc comment records README exemption 3.
- **Deviations and additions the plan didn't spell out:**
  - `standardDataSource()` drops `null` filter values as well as `undefined`;
    `features.importTemplate` is a boolean and `features.export` a non-empty
    format list.
  - `ImportReport` gained an optional `errors` list to carry the R7 Q1
    partial-save variant.
  - The 412 flow is `manager.conflict` + `reloadConflict()`: it re-reads the row
    for its new `ETag` and keeps the user's edits. Update reads the row fresh
    (`get`) before opening the form, for its `ETag`.
  - `ng-bootstrap/crud` mode `'upload'` became `'import'`, the `'download'` mode
    is gone (export is a direct `GET`), and permission keys `.upload`/`.download`
    are now `.import`/`.export`. Breaking; include in the release note (H4.6).
  - The table now renders one server page (`sidePagination: 'server'`,
    `pagination: false`); table refresh is off because it has no `ajax`.
  - Steps 6 and 7 were written together in `ng-bootstrap/crud`, then verified as a
    whole (the old upload/download views could not stand alone on the new
    contract).
  - The demo's mock `/api` is now stateful and speaks the H4.1 wire table
    (`ETag`/`If-Match` 412, `Idempotency-Key` replay, `orderBy` allow-list, a
    `bad*.csv` import returns 422 row errors); the e2e spec covers sort, filter,
    two-step import and row errors.
- **Not done:** H4.6 wire acceptance against a pykit fixture, and the release
  note; both wait for the owner review and pykit R7/R8.
