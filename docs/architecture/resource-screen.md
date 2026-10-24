# Resource screen

The CRUD resource screen: `@rn-forge/ng/crud` holds the presentation-free controller and the wire contract, and `@rn-forge/ng-bootstrap/crud` renders it. The screen is a client of published wire standards, not of a backend ([ADR-0005](../adr/ADR-0005.md)). The work that remains is tracked in [E4](../specs/epics/E4-standard-resource-screen/index.md).

## Standards

Order of authority ([ADR-0001](../adr/ADR-0001.md)): the published standard (RFC, then AIP where no RFC applies), then Angular's own mechanism, then an ngkit wrapper.

| UI concern                 | Standard                                                                                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List and pagination        | AIP-158: `pageSize`, `pageToken` → `items`, `nextPageToken` (`null` on last), `totalSize` opt-in                                                                                                         |
| Sorting                    | AIP-132 `orderBy` (`name desc`), allow-listed; a changed order with an old token is 400                                                                                                                  |
| Filtering                  | Per-field query parameters (AIP-160's filter language rejected)                                                                                                                                          |
| Errors and validation      | RFC 9457 `application/problem+json` (recognized by media type, not body shape); `errors[].{pointer, detail}`                                                                                             |
| Update and concurrency     | `PATCH` = RFC 7396 merge patch; `ETag` + `If-Match` → 412                                                                                                                                                |
| Create retries             | `Idempotency-Key` (IETF draft); same key + different body 422, in flight 409                                                                                                                             |
| Delete                     | 204; already absent is 404                                                                                                                                                                               |
| Export                     | `GET` collection with `Accept: text/csv` or xlsx; `?format=` fallback; `Content-Disposition` with `filename*` (RFC 6266/8187)                                                                            |
| Import and template        | `POST …:import` multipart `file`, `?validateOnly=true` (AIP-163) → `{created, updated, skipped, validateOnly}`; row errors 422 with `pointer = /rows/12/Quantity`; `GET …:importTemplate[?prefill=true]` |
| Bulk                       | `:batchCreate` `{requests}` (AIP-233); `:batchDelete` `{ids}` → 204 (AIP-235); all or nothing                                                                                                            |
| Field names and timestamps | camelCase; RFC 3339 UTC (AIP-142); audit fields `createTime`, `updateTime`, `createdBy`, `updatedBy`                                                                                                     |

The screen sends one `orderBy` field. AIP-132 allows several, but servers may reject more than one.

## Data-source contract

Names follow the AIP standard and custom methods, so a generated client's `operationId`s (`ordersList`, `ordersBatchDelete`, `ordersImport`) map one-to-one.

- `list(request: ListRequest)` → `Observable<ListResponse<$S>>`, where `ListRequest = { pageSize?, pageToken?, orderBy?, filter?: Record<string, …> }` and `ListResponse<T> = { items: T[]; nextPageToken: string | null; totalSize?: number }`.
- `get(id)`, `create(payload, { idempotencyKey? })`, `update(id, patch, { etag? })`, `delete(id)`. `get`, `create` and `update` return `Versioned<$S> = { value: $S; etag?: string }`, so the screen can send the `ETag` it read back as `If-Match` without parsing headers itself.
- Optional, feature-detected by the screen (absent method → action hidden): `batchDelete(ids)` → `void`; `import(file, { validateOnly })` → `ImportReport`; `importTemplate(filter, { prefill })` and `export(format, filter)` → `{ blob, fileName }`.
- Errors pass through unchanged as `HttpErrorResponse`. The screen reads RFC 9457 bodies from them; it defines no error envelope.
- `$K extends string | number`. `WriteModel`/`ReadModel` keep only `id`.
- Standards-following backends use `standardDataSource()`; any other backend adapts in the app ([ADR-0005](../adr/ADR-0005.md)). An app with a generated client may implement the contract over it instead.

## Package split

Presentation-free state and behavior are in `ng` ([ADR-0002](../adr/ADR-0002.md)), so `ng-bootstrap/crud` and a future `ng-tailwind/crud` wrap the same controller.

**`@rn-forge/ng/crud`** holds everything that talks to the wire standards, and nothing visual. Its exports (`libs/ng/crud/src/index.ts`):

- `crud.types.ts`: the contract and types (`CrudDataSource`, `ListRequest`, `ListResponse`, `Versioned`, `ImportReport`, `CrudFileDownload`, `CrudFilter`, `WriteModel`, `ReadModel`).
- `crud.list.ts`: `createCrudList()`, a list controller on Angular's `rxResource`: page-token stack (previous/next, reset on `orderBy`, filter or page-size change), `orderBy` state, selection keyed by `$K`, latest-request-wins.
- `crud.errors.ts`: `problemToFormErrors(error, form)`, which takes the `HttpErrorResponse` and maps RFC 9457 `errors[].pointer` (JSON Pointer, RFC 6901) to controls, with unmatched entries as a form-level error; `crudErrorKind()` (a 412 is a `conflict`; any other 4xx is a `problem` only when its media type is `application/problem+json`, so a 422 `application/json` body with `errors` is `other`); `ProblemFieldError`; `SERVER_ERROR_KEY`. It reads problems through `problemOf` and `Problem` from `@rn-forge/ng/core` ([E14](../specs/epics/E14-problem-client/index.md)). It is hand-rolled under [ADR-0001](../adr/ADR-0001.md) exemption 1: npm was searched 2026-09-23 and no maintained package maps RFC 9457 pointers onto Angular forms. The pointer parse is a few lines, so it takes no JSON Pointer dependency.
- `crud.files.ts`: `fileNameFrom(response)`, which reads `Content-Disposition` through the `content-disposition` package's `parse()` (jshttp, ESM, no dependencies; RFC 6266 and RFC 8187 `filename*`); it is a `dependency` of `ng` through `allowedNonPeerDependencies`. Also `IdempotencyKey` (one `crypto.randomUUID()` per submit attempt, reused on retry) and `crudFeatures()` (optional-method feature detection).
- `crud.standard.ts`: `standardDataSource(config)`.

Saving a file is `AppUtil.saveBlob` in `ng/core`, not wrapped around `file-saver`: checked on npm 2026-09-23, `file-saver` 2.0.5 was last released 2020-11 and its repository last pushed 2023-03. The needed slice is six lines of anchor and object-URL glue, which is ADR-0001 exemption 3; the `saveBlob` doc comment records it. Don't add a second save helper.

**`@rn-forge/ng-bootstrap/crud`** renders the controller: table, forms, delete modal, import dialog. It keeps no data logic. A future `ng-tailwind` gets its own renderer over the same controller: any presentation package that renders a CRUD screen builds on `createCrudList()`.

## `standardDataSource()` wire mapping

`standardDataSource()` is the `CrudDataSource` for any backend following the standards above, over native `HttpClient`. Call it in an injection context, like `inject()`:

```ts
readonly dataSource = standardDataSource<Order, OrderInput, string>({
  baseUrl: inject(ORDERS_API_URL), // app-owned token, see the HTTP guide
  collection: '/orders',
  features: { batchDelete: true, import: true, export: ['text/csv'] },
});
```

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

- Optional methods exist on the returned object only when `features` enables them, so the screen's feature detection hides the rest. `features.importTemplate` is a boolean and `features.export` a non-empty format list.
- `baseUrl` and `collection` are required; a missing one fails with `[rn-forge.ng.crud]`. Ids are path-encoded with `encodeURIComponent`. There is no slash normalization.
- Filter params drop `undefined` and `null`, repeat array values (`form`/`explode`), and go through `HttpParams`.
- No retries, caching, error mapping or `catchError`: `HttpErrorResponse` passes through unchanged. Interceptors and tracing stay the app's ([HTTP guide](../guides/http.md)).
- File responses return `{ blob, fileName }` via `fileNameFrom`.
- Nothing names or detects a backend; any standards-following backend works.

## Screen behavior

- **No numbered pages, and no total by default.** Next/previous (token stack) or "load more". `totalSize` shows only when the backend sends it.
- **Column sort writes `orderBy`**, only for columns the app marks sortable, since the server allow-lists them.
- **Filters are named query parameters** the app declares; there is no expression builder.
- **Server validation lands on the form** through `problemToFormErrors`, for responses with media type `application/problem+json`.
- **412 on save** offers reload; it never silently overwrites.
- **Import is two steps.** Upload with `validateOnly=true`, show the report or 422 row errors, then commit. A backend may answer an import with 200 and an `errors` list (partial save); the screen shows those errors.
- **Export is a `GET` download** (`Accept` negotiation), not `POST …/download`.
- **Create sends an `Idempotency-Key`** (a UUID per submit attempt, reused on retry) when the data source accepts one.

## Implementation notes

- `createCrudList()` is a function on `rxResource`, not an injectable: the data source belongs to one screen, so nothing is shared through DI.
- Errors land on controls and the form as `{ server: string[] }`.
- The 412 flow is `manager.conflict` plus `reloadConflict()`: it re-reads the row for its new `ETag` and keeps the user's edits. Update reads the row fresh (`get`) before opening the form, for its `ETag`.
- `null` filter values are dropped like `undefined`.
- `ImportReport.errors` is optional; it carries the partial-save variant.
- The table renders one server page (`sidePagination: 'server'`, `pagination: false`); table refresh is off because it has no `ajax`.
- `CrudComponentMode` is `'list' | 'addupdate' | 'import'`; export is a direct `GET`, so there is no download mode. The permission keys are `.list`, `.create`, `.update`, `.delete`, `.import` and `.export`.

## Cross-origin downloads

A browser can read `Content-Disposition`, and so the export or template file name, only when the backend lists it in `Access-Control-Expose-Headers`. Without it, `fileNameFrom()` returns its `fallback` (`'download'` unless the caller passes another), and so does a response with no filename or a malformed header.
