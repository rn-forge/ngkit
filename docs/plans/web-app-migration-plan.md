# Web-app ↔ ngkit migration plan

Reviewed 2026-09-23. Implementation handoff. A0, H1 and H2R are complete (see the
completion record). H3 storage is the next handoff. APIs proposed in later
sections don't exist yet.

Every item follows the **Design principles** in the ngkit `README.md` (the pykit
principles applied to Angular). Where a section below conflicts with them, the
principles win unless the section records the deviation and its reason.

Repositories: `rn-forge/web-app` (consumer, `apps/web`) and `rn-forge/ngkit`
(library). H2 also takes its standards boundary from `rn-forge/pykit`. Source
references beginning `web:` are relative to the consumer; references beginning
`pykit:` are relative to pykit; all other paths are relative to ngkit. Read each
affected repository's CLAUDE.md and README.md before implementing. Preserve
unrelated working-tree changes.

## Decision and boundaries

Adopt the small usable portion of `@rn-forge/ng/core` now. Keep Tailwind and
Angular CDK. Build a separate `@rn-forge/ng-tailwind` package for presentation;
it must not import or depend on `@rn-forge/ng-bootstrap`. Shared state belongs
in `ng`, not either presentation library. Do not implement every proposal in
one change: follow the dependency order and acceptance gates below.

The current app uses Angular ~22.1.0, RxJS ~7.8.0, Tailwind ~4.3.3, Nx 23.2.1,
standalone components, signals, OnPush, and zone change detection. ngkit source
is 0.1.2, Angular peers ~22.0.6, RxJS ~7.8.2 and Nx 23.1.0. Both use TypeScript
~6.0.3. Nx versions do not need to match across independently built packages.
Angular peer declarations do need reconciliation and consumer validation.

Existing `docs/plans/cims-extraction-plan.md` and `cims-adoption-plan.md` are
proposals, not implemented capabilities. Reconcile the theme/date/core work
with them; do not create competing theme services or duplicate packages.
The existing local `dist/libs/ng/package.json` reports 0.1.1 despite source
0.1.2: never use that stale directory as evidence of a current release.

## Review: library to app

| Candidate                                         | Decision                                        | Exact reason / app mapping                                                                                                                                                                                                      |
| ------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LocalStorageService`, `provideRnForgeCoreConfig` | Adopt now with app catches                      | Configure `appName: 'portal'`; theme uses key `theme`, visit uses `lastVisit`, preserving existing `portal.*` keys. Library throws on unavailable storage and malformed JSON; keep app recovery and validation.                 |
| `DateUtil.today()`                                | Adopt now                                       | Replaces local calendar-date construction in `web:apps/web/src/app/home/visit.service.ts`. Does not replace timezone-aware `core/format.ts`.                                                                                    |
| `@rn-forge/ng/http`                               | Retire (H2R, supersedes H2)                     | H2 reduced it to `inject(HttpClient)` plus one string concatenation behind a single global base URL. Apps use native HttpClient with one base-URL token per backend; the portal's OpenAPI document owns operations and schemas. |
| `HttpUtil.formatError`                            | Remove in H2                                    | Error representation belongs to the OpenAPI document and application, not a generic HTTP package.                                                                                                                               |
| `RouteService`                                    | Keep Angular Router                             | `navigateByUrl` forces `replaceUrl: true` and reload. Portal navigation needs normal history plus query/fragment preservation. Snapshot facade does not replace signal-derived position.                                        |
| `PubSubService`, BaseComponent/mixins             | Keep native signals and composition             | Would replace smaller existing code with inheritance and subscription management. No demonstrated saving.                                                                                                                       |
| `HtmlAttributesDirective`                         | Defer / no current need                         | Only applies attributes on ngOnInit; does not update/remove changed ARIA attributes. Existing direct bindings are safer.                                                                                                        |
| `FormUtil`                                        | No present consumer; fix before future adoption | Read-only portal has no equivalent form boilerplate. Dirty/truthy checks skip pristine values, zero and zero-valued limits. DATE_RANGE subscriptions clear unrelated errors.                                                    |
| `ObjectUtil.diff`                                 | Do not adopt                                    | No current diff requirement; lodash isEmpty treats distinct scalar values as empty, causing false equality.                                                                                                                     |
| `@rn-forge/ng/http/crud`                          | Exclude from the version-1 generic HTTP package | Numeric IDs, route conventions and the DRF envelope are a backend adapter dialect. Reintroduce it only as a separately named package justified by a real consumer.                                                              |
| `@rn-forge/ng/auth`                               | Out of this migration                           | No matching identity flow in this app. Default disableAuth is true; adding provider alone does not enable enforcement. Auth interceptor tests must cover HttpErrorResponse, not only successful events.                         |
| All `ng-bootstrap` UI                             | Do not adopt                                    | Bootstrap styles/runtime and table jQuery machinery duplicate the Tailwind/CDK stack and would require template redesign.                                                                                                       |

## Review: app to library

| Priority | Source in `web:apps/web/src/app`                                            | Destination                                                 | App-owned remainder                                                        |
| -------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| P1       | `core/page-resource.ts`, `.spec.ts`                                         | `@rn-forge/ng/resource` secondary entry point               | PageState, ApiError classification, source names, prototype reload counter |
| P1       | `core/theme.service.ts`, `.spec.ts`; `../index.html`                        | `@rn-forge/ng/core` theme controller + pre-paint recipe     | Portal key configuration, brand tokens/fonts, mode labels                  |
| P1       | `ui/health-chip`, `empty-state`, `state-block`, `page-skeleton`             | `@rn-forge/ng-tailwind` presentation primitives             | Health/source mapping, product copy, route destinations                    |
| P2       | `shell/top-bar/crumb-menu.component.ts`, `core/overlay.service.ts`          | Tailwind connected menu based on CDK Menu                   | Crumb model, sibling hierarchy, query/fragment construction                |
| P3       | `mocks/scenario.ts`, `prototype-bar.component.ts`, `core/prototype-slot.ts` | Optional development-only entry point, after second adopter | Fixture payloads, PortalApiService, stages and scenario registry           |

Keep `PositionService`, `TreeService`, `StatusService`, `VisitService` business
rules, generated API types, LOB tiles, primer, flow ribbon, highlights, source
logos and brand assets local. Fixed-English `formatAsOf`/`formatDay` are product
display policy; generic timezone utilities can be evaluated separately. Do not
extract the whole shell. `components.css` contains aspirational drawer/table/
palette/help styles: these are not implemented reusable components.

## A0 — Immediate adoption in web-app — completed 2026-09-19

Implemented against the immutable v0.1.2 GitHub release artifact. The numbered
steps below now describe the completed baseline that a later ngkit migration
must preserve.

1. Consume an immutable versioned ng tarball; commit dependency and pnpm lock.
   Prefer official GitHub release artifact, or a reproducible fresh pack with
   recorded source revision. Never use `link:../ngkit`, a sibling dist path or
   TypeScript path aliases to ngkit sources. npm publication is disabled here.
2. Add `provideRnForgeCoreConfig({ appName: 'portal' })` to app providers.
3. Inject `LocalStorageService` in theme and visit services. Use unprefixed keys
   `theme` and `lastVisit`; retain try/catch, invalid-theme fallback, VisitRecord
   validation and the existing write-failure behavior. Keep the pre-paint script
   using raw localStorage: Angular DI is unavailable before bootstrap.
4. Replace only VisitService's `localDate()` helper with `DateUtil.today()`.
   Keep timezone-aware timestamps unchanged. Add local-calendar regression test.
5. Configure core providers in service tests; construct VisitService through
   TestBed now that it injects a dependency. Existing storage key tests must pass
   unchanged. Test blocked storage and malformed JSON.
6. Reconcile Angular peer range narrowly for this package/version only if a
   consumer compatibility test passes; never globally suppress peer failures or
   install a second Angular version. Document the temporary exception beside the
   package-manager rule and in this completion record. Remove it after H1 releases
   correct metadata.
7. Run consumer `task web:lint`, `task web:test`, `task web:build`. Verify actual
   resolved Angular version is shared and production bundles contain no Bootstrap,
   jQuery or auth initialization. Record results in the completion section.

## Handoff decisions — resolved 2026-09-19

These resolve the open questions in H1–H3 and are binding for the implementation
handoff. Claims below were verified against source at commit `03b4faf`.

1. **Consumer fixture (H1).** Build `tools/scripts/verify-consumer.mjs`: it creates
   throwaway consumer projects under `dist/consumer-fixtures/`, installs the built
   `.tgz` via a `file:` path together with a pinned Angular version, then builds and
   runs a smoke test importing each secondary entry point. Matrix: Angular 22.0 and
   22.1, each with zone and zoneless change detection. Expose it as an nx target on
   `ng` and wire it into `ci.yml`'s `package` job. Do not use verdaccio, and do not
   add fixture apps to the pnpm workspace.
2. **lodash-es (H1).** `isEmpty` in `ObjectUtil._diffTargetKey` is core's only
   lodash usage. Replace it with a local check so `lodash-es` becomes auth-only,
   then move `lodash-es`, `build-url-ts` and `jwt-decode` from `peerDependencies`
   into `dependencies` with ng-packagr `allowedNonPeerDependencies`. Note that
   ng-packagr emits one manifest for the whole package: secondary entry points
   cannot declare their own peers, so moving to `dependencies` is the only
   mechanism available. `@angular/forms` and `@angular/router` stay mandatory
   peers — `FormUtil` and `RouteService` keep `core` bound to both.
3. **Peer widening (H1) covers both `ng` and `ng-bootstrap`**, since they release
   in lockstep. `ng-bootstrap` also peers on `@angular/cdk`, `@angular/localize`
   and `@ng-bootstrap/ng-bootstrap`; reconcile those in the same change.
4. **`workspace:*` in the CI pack path (H1).** `tools/scripts/verify-dist-manifests.mjs`
   currently runs only from `release.yml`. `ci.yml`'s `package` job runs plain
   `nx pack`, so `ng-bootstrap`'s `workspace:*` peer on `@rn-forge/ng` ships in the
   CI tarball. Extend the check to the pack path.
5. **H3 scope for this handoff is the storage item only.** It is the only H3 entry
   on a critical path (removing web-app's A0 catches; E2's theme controller). The
   remaining eight items stay a tracked backlog. Auth is explicitly excluded and
   needs a separate security review; the `TreeService`/`StatusService` polling
   refactor is excluded as well.
6. **Coverage.** `ng`'s test target enforces 80% statements/branches/functions/lines
   across `core` and `auth` (`http` was removed by H2R). New code must clear it without lowering the
   thresholds.

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

## H2 — Minimal HTTP plumbing for OpenAPI clients (second PR)

> **Superseded by H2R below.**
> H2.1's authority rules and H2.3's removals stand. The `OpenApiHttpService`
> surface in H2.2, H2.4–H2.6 is retired rather than shipped.

This is the version-1 contract, so do not preserve the current experimental
API. The standards rebaseline in
`pykit:docs/plans/standards-rebaseline-plan.md` is binding: published standard
first, framework-native mechanism second, toolkit wrapper last. The OpenAPI
document describes the API. ngkit must not create a parallel client schema or
silently change the documented wire behavior.

A generic Angular service that does not read an OpenAPI document is not itself
an OpenAPI client. It is transport plumbing used by a generated or hand-written
OpenAPI operation client. Keep that distinction explicit:

```text
OpenAPI 3.1 document
        ↓ generates or guides
application-owned operation client
        ↓ uses
ngkit base URL token + Angular HttpClient
        ↓
documented HTTP API
```

Files: `libs/ng/http/src/lib/http.config.ts`, `http.services.ts`, public
exports, focused unit/integration specs, and the HTTP README. Delete obsolete
HTTP types, utilities and interceptors when nothing outside the removed
version-0 surface uses them.

### H2.1 — Authority and scope

- OpenAPI 3.1 plus the standards referenced by the API document are the sole
  authority for paths, methods, parameter serialization, headers, media types,
  request/response schemas, status codes, security and errors.
- ngkit provides only repeated Angular plumbing: a selected server base URL,
  `HttpClient` access, and exact construction of the operation URL.
- An operation client owns one method per OpenAPI operation. Its method name,
  input/output types and serialization follow the document, preferably through
  generation. A hand-written client follows the same rule and is tested against
  the document.
- Framework implementation is unobservable. Do not mention or detect Python,
  Django, DRF, FastAPI, pykit or portal behavior in the runtime HTTP package.
- Do not add resource models, request/response base types, problem types,
  pagination envelopes, health models, header-name constants, error taxonomies
  or domain adapters. Generated/application code owns document schemas.
- Do not add retries, caching, deduplication, polling, redirects, authentication,
  tracing, logging, metrics, idempotency, concurrency or error mapping. Use
  Angular interceptors or the application's observability layer when the
  OpenAPI/HTTP contract calls for them.

### H2.2 — Version-1 public surface

Use Angular's native client rather than wrapping and duplicating its overload
matrix. The reusable base class removes only dependency-injection and base-URL
boilerplate:

```ts
export interface RnForgeHttpConfig {
  /**
   * Expanded URL from the selected OpenAPI Server Object.
   * Use '' when the document intentionally targets the current origin.
   */
  readonly baseUrl: string;
}

export const RN_FORGE_HTTP_CONFIG = new InjectionToken<RnForgeHttpConfig>('RnForgeHttpConfig');

export function provideRnForgeHttpConfig(config: RnForgeHttpConfig): EnvironmentProviders;

export abstract class OpenApiHttpService {
  protected readonly http: HttpClient;
  protected readonly baseUrl: string;

  /**
   * Appends an expanded OpenAPI path to the configured Server Object URL
   * exactly as OpenAPI defines; performs no URI normalization.
   */
  protected endpoint(path: `/${string}`): string;
}
```

Implementation requirements:

- Inject `HttpClient` and `RN_FORGE_HTTP_CONFIG` in the base class. Keep both
  readonly. Do not inject core configuration.
- `provideRnForgeHttpConfig` registers only its config token. It must not call
  `provideHttpClient`, install interceptors or alter an application-owned
  `HttpClient`.
- `baseUrl` is required even when its intentional value is `''`. Fail with a
  clear injection/configuration error when the provider is absent; never produce
  `undefined` in a URL.
- `endpoint(path)` returns `${baseUrl}${path}`. It does not add, remove or
  collapse slashes; resolve dot segments; change case; decode or re-encode
  percent escapes; or inspect query/fragment text.
- The path type requires the leading slash mandated for OpenAPI Paths Object
  keys. An operation client expands path templates and percent-encodes each
  path parameter according to the document before calling `endpoint`.
- Query and header parameters go directly through Angular
  `HttpParams`/`HttpHeaders` or the exact native `HttpClient` option types.
  Do not provide a generic record serializer: OpenAPI styles such as
  `form`, `spaceDelimited`, `pipeDelimited`, `deepObject`, `explode`
  and `allowReserved` cannot be represented correctly by one house rule.
- Derived clients call native `HttpClient.get/post/put/patch/delete/request`.
  This preserves Angular's typed `observe`, `responseType`, progress-event,
  context, credentials and transfer-cache behavior without ngkit casts or a
  second overload system.
- Return Angular's native `Observable<T>`, `Observable<HttpResponse<T>>` or
  `Observable<HttpEvent<T>>` selected by the operation. Do not subscribe,
  convert to promises, share, cache or otherwise alter cancellation/lifecycle.
- Let Angular emit the original `HttpErrorResponse`. Do not catch merely to
  log or rethrow, and do not infer a problem schema from status or body shape.

### H2.3 — What is removed from version 1

Delete rather than deprecate the pre-version-1 abstractions:

- `TrailingSlashPolicy`, `apiBasePath`, `updateBasePath`, `getEndpoint`,
  `getQueryString` and whole-URL slash normalization.
- The uppercase `GET`, `POST`, `PUT`, `DELETE`, `DOWNLOAD_GET` and
  `DOWNLOAD_POST` wrappers. Derived clients use Angular's native methods.
- `GenericType` request options and query parameters.
- `BaseRequest`, `BaseResponse`, the current backend-specific
  `ErrorResponse`, any proposed `ProblemDetail`, `Page<T>`,
  `PageRequest`, header constants, error adapters and diagnostic event schema.
- `HttpUtil.formatError`. Error representation comes from the OpenAPI
  document/application.
- `DownloadResponse` and automatic filename parsing. A documented file
  operation returns Angular's native `HttpResponse<Blob>`; application code may
  use a separately evaluated RFC 6266 implementation when it needs a suggested
  filename.
- `basicHttpInterceptor`. Applications compose purpose-specific functional
  interceptors with Angular's `provideHttpClient(withInterceptors(...))`.
- `@rn-forge/ng/http/crud` from the version-1 generic HTTP contract. Its numeric
  IDs, DRF envelope and route conventions are an adapter dialect, not OpenAPI
  plumbing. Move it to a separately named package only after a real consumer
  justifies that adapter; do not make H2 compile around it.
- `RnForgeCoreConfig.apiBasePath`. Core has no HTTP responsibility.

Before deletion, use `rg` to enumerate imports across this repository. Update
repository-owned demos/tests/docs in the same PR. Because no version 1 has been
released, do not add aliases, forwarding wrappers or compatibility flags.

### H2.4 — Operation-client guidance

The HTTP README must show a small hand-written client without inventing a
shared schema:

```ts
@Injectable({ providedIn: 'root' })
export class OrdersApi extends OpenApiHttpService {
  getOrder(orderId: string): Observable<Order> {
    const id = serializeOrderIdPathParameter(orderId);
    return this.http.get<Order>(this.endpoint(`/orders/${id}`));
  }

  updateOrder(orderId: string, body: UpdateOrder, etag: string): Observable<HttpResponse<Order>> {
    const id = serializeOrderIdPathParameter(orderId);
    return this.http.put<Order>(this.endpoint(`/orders/${id}`), body, {
      headers: new HttpHeaders({ 'If-Match': etag }),
      observe: 'response',
    });
  }
}
```

`Order`, `UpdateOrder`, `serializeOrderIdPathParameter`, paths, headers and
response mode in the example are explicitly application/OpenAPI-owned. They are
not exported by ngkit; the serializer follows that parameter's declared OpenAPI
style, explode and allowReserved values.

Also document:

- Prefer a generated client when a stable OpenAPI document and suitable Angular
  generator exist. Keep generated files application-owned.
- Configure a generator to consume the same `baseUrl` token if its templates
  support injection; otherwise it may inject `HttpClient` directly. It does not
  need to extend `OpenApiHttpService`.
- Never edit generated output manually. Generator configuration and any template
  customization are source-controlled and regeneration is deterministic.
- Do not claim that extending the base class provides OpenAPI conformance.
  Conformance comes from the source document, generator/implementation accuracy,
  and contract tests.

### H2.5 — Required verification

- Configuration tests prove an explicit absolute URL, relative URL and empty
  same-origin URL are injected unchanged, and that a missing provider fails
  clearly.
- Endpoint table tests use bases `''`, `'/api'`,
  `'https://api.example.test/v1'` and bases ending in `/`; use paths with and
  without terminal slashes, percent escapes, Unicode and `:action`. Assert
  exact concatenation, including deliberately doubled boundary slashes, to prove
  the library performs no undocumented normalization.
- A fixture operation service exercises GET, POST, PUT, PATCH, DELETE, a JSON
  body response, `observe: 'response'`, a blob response and progress events
  through native `HttpClient` calls. `HttpTestingController` asserts exact
  method, URL, params, headers, body and response mode.
- Parameter tests are fixture-operation tests, not transport serializers. Cover
  at least repeated query keys, an encoded path segment and one non-default
  OpenAPI query style built explicitly by the operation client.
- Error tests prove 4xx, 5xx and status-0 failures reach the subscriber as the
  identical `HttpErrorResponse` instance and that the base class writes to no
  console method.
- Cancellation test proves unsubscribe cancels the native request without an
  internal subscription.
- Provider integration uses exactly one application-owned `provideHttpClient`
  and proves the ngkit provider installs no interceptor.
- Public API tests prove the HTTP entry point exports only configuration and
  transport plumbing, and does not export application wire models or the removed
  CRUD dialect.
- Update `tools/scripts/verify-consumer.mjs` so the post-H2 entry-point matrix no
  longer expects `./http/crud`; keep the historical H1 completion record below
  unchanged as evidence of what H1 verified at that time.
- README examples compile in the isolated consumer fixture. Run the relevant
  library lint/test/build/pack checks and the H1 Angular 22.0/22.1 zone/zoneless
  matrix without lowering coverage.

### H2.6 — Portal and generated-client adoption gate

H2 is complete from its own transport tests; portal behavior is not its
specification. Adoption happens only against the portal's OpenAPI document:

1. Generate or hand-write operation methods from that document.
2. Keep `PortalApiService` as the mock/real application boundary.
3. Compose the real implementation with the operation client. Do not add a
   second base class or move portal error/domain policy into ngkit.
4. Compare the result with direct generated-client/`HttpClient` use. If
   `OpenApiHttpService` removes no meaningful boilerplate, the application
   should not use it.

Do not force a shared pagination, problem, health, tracing or header schema into
the portal. It consumes exactly what its OpenAPI document declares.

## H2R — Retire `@rn-forge/ng/http` (supersedes H2.2–H2.6) — decided 2026-09-22, completed 2026-09-23

H2 and H2R land together as one change. Implemented as specified, with the
deviations listed in the completion record.

### H2R.1 — Why

After H2, `OpenApiHttpService` is `inject(HttpClient)` plus `${baseUrl}${path}`.
That does not justify a public entry point:

- **One global base URL.** `RN_FORGE_HTTP_CONFIG` holds one `baseUrl`, but apps
  call several backends. A singleton injected into every service makes that
  worse, and generalizing it (per-service tokens, overridable `baseUrl`) just
  re-creates what an app-owned `InjectionToken` already does.
- **The name promises behaviour it doesn't have.** Nothing in the class reads an
  OpenAPI document; any HTTP API client would use it the same way.
- **Composition costs the same.** Two `inject()` field initializers replace
  `extends`, with no constructor coupling. This plan already rejected
  BaseComponent/mixins on the same grounds.
- **No boilerplate saved.** H2.6 step 4's own test: if it removes no meaningful
  boilerplate, don't use it. The largest real saving is a generated client,
  which does not need ngkit either.

Do not rename it, generalize it or add a second "basic" client. The basic HTTP
client is Angular's `HttpClient`.

### H2R.2 — Removal scope (implementing PR)

- Delete `libs/ng/http/**` (sources, specs, README, `ng-package.json`).
- Remove the `@rn-forge/ng/http` path from `tsconfig.base.json`, the
  `libs/ng/http/src/**` entries from `libs/ng/project.json` test
  include/`coverageInclude`, and the `http` entry from
  `tools/scripts/verify-consumer.mjs`'s entry-point matrix.
- `libs/ng/auth`'s `AuthBackendService` extends `OpenApiHttpService`. Make it
  inject `HttpClient` directly and take its base URL from `RnForgeAuthConfig`
  (for example `backend.baseUrl`, required and never `undefined`, following
  H2.2's missing-config rule). Auth then carries its own endpoint config instead
  of borrowing a global one.
- Remove `provideRnForgeHttpConfig` from
  `libs/ng-bootstrap/auth/src/lib/auth/auth.component.spec.ts` and
  `apps/ng-demo/src/app/app.config.ts`.
- **Fix the CRUD screen (see H2R.2a).** `libs/ng-bootstrap/crud` and
  `apps/ng-demo/src/app/products` still import `@rn-forge/ng/http/crud` and
  `HttpUtil`/`DownloadResponse`. H2 removed those without updating these
  consumers, and `pnpm nx run-many -t build --projects=ng,ng-bootstrap` fails
  on the H2 tree (checked 2026-09-22):
  `crud.manager.ts:12 TS2305: Module '"@rn-forge/ng/http"' has no exported member 'DownloadResponse'`
  (and `HttpUtil`). Do not restore the ng entry point.
- The agent guide and the CIMS plans already describe the post-H2R state
  (updated 2026-09-22). Re-check them against the final exported names in this
  PR.
- Keep the H1 completion record unchanged; it documents what H1 verified.

Verification: `pnpm nx run-many -t lint test build --projects=ng,ng-bootstrap,ng-demo`
and `pnpm nx run ng:verify-consumer`, with coverage thresholds unchanged.

### H2R.2a — CRUD screen: a data-source interface owned by the screen

`AbstractCRUDManager` needs a data contract: list/read/create/update/delete,
bulk delete, upload, upload template and download. That contract belongs to the
screen, not to a transport base class. Two consumers justify it: the demo, and
CIMS, whose DRF backend returns exactly this list envelope.

- Define `CrudDataSource<$Q, $S, $K extends string | number = number>` in
  `@rn-forge/ng-bootstrap/crud`. It lists exactly the methods the manager calls,
  each returning `Observable`.
- Move `ReadModel`, `WriteModel`, `ListResponse`, `BulkDeleteResponse` and
  `UploadResponse` into `ng-bootstrap/crud` as that interface's types. Drop the
  `BaseRequest`/`BaseResponse` parents. Add the `$K` key generic now; this
  covers CIMS extraction plan R2 (string IDs).
- `domainService` becomes `abstract get dataSource(): CrudDataSource<$Q, $S, $K>`.
  The app implements it with native `HttpClient` (the H2R.3 pattern) or a
  generated client. No ngkit base class is involved.
- `download()`/`uploadTemplate()` return `{ blob, fileName }`; the data source
  picks the filename. The manager saves it with a new
  `AppUtil.saveBlob(blob, fileName)` in `@rn-forge/ng/core`. That is DOM glue:
  create an object URL, click an anchor, revoke the URL. It is the helper CIMS
  extraction plan I-1 already wanted in core.
- Replace `HttpUtil.formatError` with a protected manager hook,
  `errorMessage(err: HttpErrorResponse): string`, defaulting to `err.message`.
  Apps override it to read their own error body.
- Rewrite the demo `products` resource as a `CrudDataSource` implementation over
  `HttpClient`. It is the canonical example the agent guide points to.
- **Follow-up, not this PR:** if `@rn-forge/ng-material` (CIMS extraction plan
  Tier B) gets a CRUD screen, move `CrudDataSource` and its types to a headless
  location, the same way R1 moves config machinery.

### H2R.3 — Application HTTP pattern (replaces the H2.4 README guidance)

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
root-URL setting; point it at the same token). H2.1's serialization and
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
use `file-saver`, or a direct `<a href download>` for large cookie-authenticated
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
  resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'portal' }),
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
  is the same adapter dialect H2.3 removed with `http/crud`. Prefer generated
  clients; otherwise an app may keep a ~15-line generic base of its own that
  implements `CrudDataSource` (H2R.2a). Only a published, versioned convention
  shared by several backends would justify a separately named adapter package.
  The CRUD _screen's_ interface (H2R.2a) is a different thing and does belong in
  ngkit.

## H3 — Core correctness backlog (independent, before affected APIs spread)

Separate changes with focused tests; do not block A0 on unused APIs.
Per handoff decision 5, only H3.1 (storage) is in scope for the current
implementation handoff. H3.2 remains a tracked backlog.

### H3.1 — Safe browser storage (next handoff, ready 2026-09-23)

Branch from the committed H2R change. Read `CLAUDE.md`, `README.md` (Design
principles) and `libs/ng/core/src/lib/core.services.ts` first. Don't commit,
release or touch `nx.json`/workflows.

**Why a hand-rolled wrapper (principle #1, checked on npm 2026-09-23).**
`ngx-webstorage` 22.0.0 is maintained, but `retrieve()` returns `any` with no
validation, it reports no failure result, and it JSON-encodes every value. That
would break raw-string keys such as web-app's `portal.theme`, which a pre-bootstrap
script reads. `@ngx-pwa/local-storage` is async IndexedDB, which is a different
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
- web-app.

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
  - Two `TestBed` configurations with appNames `portal` and `portal-admin`
    share one fake `Storage`. Neither reads the other's keys.
  - `clearAll` on `portal` leaves `portal-admin.*` and unprefixed keys intact.

**Acceptance.** Run all of these. Record the output in the completion record.
`ng` coverage stays at or above the enforced 80% (currently about 89/86/95/92).

```sh
pnpm nx run-many -t lint test build --projects=ng,ng-bootstrap,ng-demo
pnpm nx run-many -t pack --projects=ng,ng-bootstrap
node tools/scripts/verify-dist-manifests.mjs
pnpm nx run ng:verify-consumer   # all four Angular 22.0/22.1 × zone/zoneless cells
```

**After release, in web-app (not this handoff):**

- `ThemeService` and `VisitService` replace their try/catch blocks with
  `tryGet` / `tryGetJSON` / `trySet`.
- Their existing blocked-storage and malformed-JSON tests must still pass.
- E2 then builds on `RNF_BROWSER_STORAGE`.

### H3.2 — Backlog (not in this handoff)

- DateUtil (`core.utils.ts`): distinguish local date-only versus UTC instant APIs.
  today/isoFormat are local while fromTimestamp/diffDate currently use UTC.
  Test offsets on both sides of UTC, leap days and DST. Keep existing methods
  compatible; add clearly named alternatives instead of changing semantics.
- FormUtil: validate pristine nonempty values, handle numeric zero and configured
  zero bounds, keep required separate. Replace DATE_RANGE subscriptions with a
  pure FormGroup ValidatorFn returning its own error key. Test unrelated errors
  remain, empty optional fields, invalid calendar dates and programmatic values.
  Publish breaking semantics deliberately; do not silently alter existing forms.
- ObjectUtil.diff: test scalar 0/1 and false/true, null, arrays, missing versus
  undefined and nested objects. Do not use isEmpty as scalar equivalence.
- HtmlAttributesDirective: react to input changes and remove attributes absent
  from the next map. Renderer2 only; tests for initial, changed and removed ARIA.
- Routing: expose normal NavigationExtras instead of forcing history replacement;
  retain a backwards-compatible route method or deprecate the old one.
- CRUD is no longer a generic HTTP/core backlog item. If a real DRF consumer
  still benefits after H2, specify its numeric/string IDs, routes and envelopes
  in a separately named adapter package without changing the generic transport.
- Auth (separate security review): make bypass explicit in docs and production
  setup; handle 401/403 in the RxJS error channel. Test allowlisted token targets,
  disabled mode, denial, no redirect loops and refresh concurrency before adoption.
  Do not introduce authentication into the portal as part of this work.
- Loading/polling: do not extract the current `TreeService.load()` or
  `StatusService.poll()` orchestration. Their nested subscriptions are not tied
  to destruction or request replacement, so an older response can overwrite a
  newer refresh. Refactor around latest-request cancellation and
  `takeUntilDestroyed`, with delayed-response tests, before considering a shared
  polling helper.

## E1 — Extract asynchronous resource (depends on H1)

New `libs/ng/resource/` secondary entry point. Port from
`web:apps/web/src/app/core/page-resource.ts` and `.spec.ts`.

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
undefined request is disabled/idle and cancels prior work. Value retention is
controlled by preservePrevious, including a changed key; portal uses true because
its current tests expect value retention on `a → b`. State this explicitly.

Implementation steps:

1. Move state/timer/cancellation mechanism; remove imports of portal ApiError,
   DataReloadService, source labels and API schema. Pass refresh as a callback.
2. Use a teardown owned by DestroyRef. Cancel subscription and all timers on
   new request, disabled request and destruction. Guard against stale results.
3. Invoke loader through defer or equivalent to classify synchronous throws.
   Define one-shot semantics: first value completes; empty completion becomes a
   documented error, never permanent loading. Reset error metadata at new attempt.
4. Default timing values may be 300/1000/10000/30000 ms; validate ordering and
   permit configuration. No HTTP or portal copy in the timing mechanism.
5. Keep local pageResource adapter with the same current exported PageResource
   interface. It supplies refresh counter and 404 → not-found, source-unavailable
   503 → unavailable, other/timeout → error. SourceFrom remains portal policy.
6. Port fake-timer tests: fast 250 ms response; each threshold; retry; retained
   value; changed key; error then success; 503 then unrelated error; disable while
   pending; destroyed resource; stale late emission; synchronous throw; empty
   completion. No real sleeps. Confirm cancelled timers do not mutate state.
7. Consumer migration touches the adapter first, leaving pages unchanged. Existing
   page-resource tests and page-state browser scenarios must still pass.

Current bugs to fix rather than fossilize: undefined request leaves old request
alive; source metadata can survive subsequent unrelated error; loader synchronous
throw bypasses state handling; empty completion can leave state loading.

## E2 — Theme controller (depends on H1; coordinate CIMS ColorModeService)

Use one shared service/API, not both ThemeService and ColorModeService. Proposed
`provideRnForgeColorMode({ storageKey, attribute, modes })`, signal mode with
`system|light|dark`, set/cycle; adapt CIMS's proposed auto spelling at its boundary.
Allow class-based output only if required by the other consumer. Keep default
configuration neutral and documented, with app providing `portal.theme`.

Port behavior and tests from web theme service. Inject DOCUMENT/storage; tolerate
absent browser, blocked storage and invalid values. Apply persisted choice at
initialization. System removes explicit attribute and stored override; CSS follows
OS. Provide a configurable pre-paint snippet with identical key/attribute, since
Angular startup cannot prevent a theme flash. No app fonts, brand CSS or logos.

Acceptance: existing tests plus initialization stamping, SSR construction, blocked
remove as well as get/set, stored dark before bootstrap, system following OS,
explicit light over dark OS, print remaining light. App adapter can retain current
ThemeService name until consumers migrate. Keep pre-paint script local/configured.

## T1 — New `@rn-forge/ng-tailwind` package (depends on H1)

Before scaffolding invoke required nx-generate skill; discover generator schema,
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
  App maps existing --surface/--ink/--ok/etc. in one bridge. Keep actual portal
  tokens and fixed typography local. Document dark-mode and overlay inheritance.
- Verify token contrast using rendered/computed CSS, not copied constants.
  Portal tokens.spec.ts records light --slate at 4.05:1/3.83:1; these cannot
  become accessible normal-text defaults. Choose contrast-verified defaults.
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

Migrate in the following order, one component family per review:

1. StatusBadge: `tone: success|warning|danger|neutral`, required visible label,
   optional description and `appearance: default|bare`. App maps HealthStatus to
   tone; preserve unknown hollow/dashed appearance. No Health type import.
2. EmptyState: projected icon/content/actions with neutral layout. The app supplies
   empty versus unavailable prose and source glyph. No ADO/SharePoint registry.
3. StateBlock: heading/description/action projection; no hard Router dependency.
   Consumers use native link or button. Portal retains retry event wiring and
   not-found/source-specific messages; keep one appropriate page heading.
4. PageSkeleton: configurable line count and loading/stalled messages. Lines
   aria-hidden; no animation by default. Timings come from E1. No embedded
   'portal API' or fixed timeout copy; accessible status announcement.
5. ThemeToggle: controlled mode input and change output, configurable accessible
   labels; it need not inject a global controller.

Carry existing tests into library where generic; retain portal assertions on copy
and mapping. Test light/dark, reduced motion, forced colors, visible text and
native action semantics. Production consumer CSS must work without source scanning.
Do not extract source-specific stale labels unless another app needs the same API.

## T3 — Connected menu (depends on T1; not a verbatim extraction)

Current crumb menu declares role=menu but only handles Escape. Implement using
CDK Menu and overlay positioning. Generic trigger + projected menu items, optional
scoped exclusivity controller if CDK does not cover current one-open behavior.
Keep portal crumb/row types and badge content in the app.

Acceptance browser cases: keyboard open, ArrowUp/Down, Home/End, typeahead,
Escape returning focus, trigger toggled twice, switching triggers, outside click,
route navigation and destroyed trigger. Clicking another focusable control must
not steal focus back to old trigger. Preserve query parameters and #blockers
fragment; delivery tab=raid&health=red route tests remain unchanged. Test overlay
placement near viewport edge and inherited theme tokens.

## E3 — Optional prototype tools (later, second adopter required)

Extract only validated URL selection/latency parsing plus registry-fed controls
and a reload callback. Optional development entry point, absent from production
barrel. Keep all portal fixture payloads, scenario IDs and matching rules local.
Tests: invalid values use documented fallback, preserve unrelated query/fragment,
same-instance switching works, no full reload, prototype sends no API or external
asset requests, production output contains neither fixtures nor controls. Do not
publish this before the second app demonstrates reduced code.

## Delivery sequence and evidence

A0 ✓ → H1 ✓ → H2+H2R ✓ (2026-09-23) → **H3.1 storage (next)** → E1/E2
(independent; E2 builds on H3.1) → T1 → T2 → T3. The rest of H3 is a separately
scoped prerequisite, only for affected features. E3 is optional later work. Each PR must
name its source files, public exports, consumer diff and test evidence. No vague
'implement shared UI' tasks. Do not change backend generated API contracts.

Library checks: inspect resolved Nx targets with `pnpm nx show project <name>
--json`; run the relevant library lint/test/build/pack via Nx. For each new
published entry point install the tarball into a clean consumer and test exports,
peer resolution and runtime styles. Confirm ng-bootstrap demo still builds after
core changes. Never run a release/publish as a validation shortcut.

Consumer checks: `task web:lint`, `task web:test`, `task web:build`; use existing
prototype browser scenarios after visual migrations. Compare home/shell/empty/
unavailable/error screens in both themes at existing responsive viewports; verify
menu focus/navigation and unchanged request URLs. Keep CSS catalogue checker
aligned when deleting migrated rules; don't bypass it. No screenshot comparison
is needed for the A0 storage/date-only change, but behavioral tests are required.

Rollback: one component/behavior per change. Retain app adapters until consumer
checks pass; remove copied implementations only after migration. A dependency
rollback also reverts imports, providers, lockfile and any narrow peer exception.
Never retain an unused ngkit dependency merely to claim standardization.

## Completion record

A0 is complete in web-app:

- `@rn-forge/ng` 0.1.2 is installed from
  `https://github.com/rn-forge/ngkit/releases/download/v0.1.2/rn-forge-ng-0.1.2.tgz`;
  the pnpm lock records its integrity.
- `provideRnForgeCoreConfig({ appName: 'portal' })` is registered once.
- Theme and visit storage use `LocalStorageService` while retaining the existing
  `portal.theme` and `portal.lastVisit` persisted keys and blocked-storage
  behavior. The pre-paint theme script stays local and unchanged.
- VisitService uses `DateUtil.today()` and has local-calendar, malformed-storage,
  same-day and blocked-write coverage.
- The app resolved one Angular runtime at 22.1.7. Because ngkit 0.1.2 declares
  `~22.0.6` peers, `pnpm-workspace.yaml` has exact-package exceptions allowing
  Angular 22.1 only. H1 must broaden and test upstream peers; after upgrading,
  remove these four consumer exceptions.
- `task web:lint` passed with existing warnings; `task web:test` passed 58 tests;
  `task web:build` passed. The production output contains no Bootstrap, jQuery or
  ngkit auth markers.
- `pnpm peers check` now reports only the pre-existing
  `openapi-typescript@7.13.0` TypeScript `^5.x` warning; no ngkit peer warning
  remains.

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
  current origin. This still meets H2.2's never-`undefined` rule, and apps
  that don't render `AuthComponent` don't need it.
- `@rn-forge/ng-bootstrap/crud` exports `CrudDataSource<$Q, $S, $K>`,
  `WriteModel<$K>`, `ReadModel<$K>`, `ListResponse`, `BulkDeleteResponse`,
  `UploadResponse` and `CrudFileDownload`. `AbstractCRUDManager` takes
  `abstract get dataSource()` and a protected `errorMessage(err)` hook.
  **Deviation:** `CrudDataSource` has only the seven methods the manager calls:
  `list`, `create`, `update`, `bulkDelete`, `upload`, `uploadTemplate` and
  `download`. There is no single-item `read` or `delete`, following H2R.2a's
  "exactly the methods the manager calls" rule rather than its longer
  prose list.
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

The remaining H3/E/T items are still proposals.
After a compatible ngkit release lands, return to web-app for the consumer-side
migrations described in each section.
