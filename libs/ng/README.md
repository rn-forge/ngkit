# ng

This library was generated with [Nx](https://nx.dev).

## HTTP

`ng` has no HTTP entry point — use Angular's native `HttpClient` directly.
`@rn-forge/ng/http` was retired (see `docs/plans/ngkit-roadmap.md`
H2R): a class that only injects `HttpClient` and concatenates a base URL adds
DI/base-URL boilerplate removal without justifying a public surface, and every
app already calls several backends.

The pattern:

- **One app-owned `InjectionToken<string>` per backend**, provided once in
  `app.config.ts` (e.g. `ORDERS_API_URL`, `INVENTORY_API_URL`).
- **API services inject `HttpClient` and their token directly**, with one
  method per operation, calling native `get`/`post`/`put`/`patch`/`delete`.
  Prefer a client generated from the backend's OpenAPI document when one
  exists over hand-writing one.
- **Errors** are Angular's native `HttpErrorResponse`, unmodified. Use one
  functional interceptor in `provideHttpClient(withInterceptors([...]))` for
  reporting/telemetry that rethrows the original error; per-call `catchError`
  only where the caller actually recovers.
- **Downloads**: request `{ responseType: 'blob', observe: 'response' }`, then
  save the result with `AppUtil.saveBlob(blob, fileName)` from `@rn-forge/ng/core`.
- **CRUD screens** (list/add/update/delete/import/export) take a
  `CrudDataSource` from `@rn-forge/ng/crud`, usually `standardDataSource()` over
  the wire standards, and pair it with `AbstractCrudManager` from
  `@rn-forge/ng-bootstrap/crud`. See `libs/ng/crud/README.md`,
  that package's README and `apps/ng-demo/src/app/products/` for the canonical
  example.

## Storage

`LocalStorageService` (`@rn-forge/ng/core`) namespaces every key with the
configured `appName` and reads/writes through `RNF_BROWSER_STORAGE`, an
`InjectionToken<Storage | null>` that resolves to `localStorage` and is `null`
when storage is unavailable (SSR, a browser blocking storage, a throwing
`SecurityError`).

The strict methods (`get`/`getJSON`/`set`/`setJSON`/`remove`/`clearAll`) keep
their original signatures and throw when storage is unavailable. The `try*`
methods (`tryGet`/`tryGetJSON`/`trySet`/`trySetJSON`/`tryRemove`) never throw:
they return a `StorageReadResult`/`StorageWriteResult` describing `found`,
`missing`, or `failed` (with a `StorageFailureReason` such as `unavailable`,
`security`, `quota`, `malformed`, `invalid`, or `unserializable`). Prefer the
`try*` methods for anything read on a hot path (e.g. a pre-bootstrap theme
read) where a storage failure shouldn't throw.

```ts
const result = storage.tryGetJSON('lastVisit', {
  validate: isVisitRecord,
  fallback: null,
});
// one-line common case:
const lastVisit = storage.tryGetJSON('lastVisit', { validate: isVisitRecord, fallback: null }).value;
```

A test injector without an application root (e.g. `Injector.create`) must
provide `RNF_BROWSER_STORAGE` explicitly — see `tools/scripts/verify-consumer.mjs`.

## Running unit tests

Run `nx test ng` to execute the unit tests.
