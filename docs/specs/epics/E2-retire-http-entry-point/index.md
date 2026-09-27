# E2 — Retire the HTTP entry point

**Status:** done · **Implemented:** 2026-09-23 (`c30d63a`) · **Owner:** ngkit

**Source:** former roadmap item H2R.

`@rn-forge/ng/http` and `/http/crud` are removed with no aliases. The basic HTTP client is Angular's `HttpClient` ([ADR-0004](../../../adr/ADR-0004.md)), and [the HTTP guide](../../../guides/http.md) records the application pattern. The interim `ng-bootstrap/crud` `CrudDataSource` this epic left in place was superseded by [E4](../E4-standard-resource-screen/index.md).

[Back to the board](../../index.md)

| ID   | Delivered                                                                                                                                                                                                                                                                                                                                                                                         | Implemented |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| F2.1 | `libs/ng/http/**` (including `/http/crud`) removed, with the `tsconfig.base.json` path, the `ng` test include and `coverageInclude` entries, `RnForgeCoreConfig.apiBasePath`, and the `./http` and `./http/crud` cells in `verify-consumer.mjs`. No import of the removed symbols remains.                                                                                                        | `c30d63a`   |
| F2.2 | `AuthBackendService` injects `HttpClient` and builds `${backend.baseUrl}${authApiRoot ?? '/auth'}${loginPath ?? '/login'}` (and the same for logout). `backend.baseUrl` is optional in the `AuthBackendConfig` type, so the service enforces it: construction throws `[rn-forge.ng.auth] … backend.baseUrl is not configured` when it is `undefined`, and `''` is accepted as the current origin. | `c30d63a`   |
| F2.3 | `AppUtil.saveBlob(blob, fileName)` added to `@rn-forge/ng/core`; the demo's `products` resource became a data source over `HttpClient` with an app-owned `DEMO_API_URL` token.                                                                                                                                                                                                                    | `c30d63a`   |

## Considered and rejected

The last version of `OpenApiHttpService` was `inject(HttpClient)` plus `${baseUrl}${path}`. It was not renamed, generalized or given a second "basic" client, because:

- one global base URL cannot serve apps that call several backends, and per-service tokens re-create what an app-owned `InjectionToken` already does;
- the name promised OpenAPI behavior it did not have;
- composing two `inject()` field initializers costs the same as `extends`;
- the largest real saving is a generated client, which does not need ngkit either.

Verified with: `pnpm nx run-many -t lint test build --projects=ng,ng-bootstrap,ng-demo`, `pnpm nx run-many -t pack --projects=ng,ng-bootstrap`, `node tools/scripts/verify-dist-manifests.mjs`, `pnpm nx run ng:verify-consumer`.
