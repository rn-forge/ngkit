# ng

This library was generated with [Nx](https://nx.dev).

## HTTP

`ng` has no HTTP entry point — use Angular's native `HttpClient` directly.
`@rn-forge/ng/http` was retired (see `docs/plans/web-app-migration-plan.md`
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
- **CRUD screens** (list/add/update/delete/upload/download) implement
  `CrudDataSource` from `@rn-forge/ng-bootstrap/crud` over the pattern above,
  and pair it with `AbstractCRUDManager` — see that package's README and
  `apps/ng-demo/src/app/products/` for the canonical example.

## Running unit tests

Run `nx test ng` to execute the unit tests.
