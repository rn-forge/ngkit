# @rn-forge/ng/crud

Secondary entry point of `@rn-forge/ng`. Import from `@rn-forge/ng/crud`.

Presentation-free state and wire behaviour for a standard resource screen. It
targets the **wire standards**, not any one backend: AIP-158 paging
(`pageSize`, `pageToken` → `items`, `nextPageToken`, opt-in `totalSize`), AIP-132
`orderBy`, per-field filter parameters, RFC 9457 problems, RFC 7396 merge patch
with `ETag`/`If-Match` (412), `Idempotency-Key`, AIP-163 `:import`, AIP-235
`:batchDelete`, `GET` export by `Accept`. `@rn-forge/ng-bootstrap/crud` renders
it; a future `ng-tailwind` renders the same controller.

| Export | What it is |
| --- | --- |
| `CrudDataSource<$Q, $S, $K>` | The screen's data contract: `list`, `get`, `create`, `update`, `delete`; optional `batchDelete`, `import`, `importTemplate`, `export` (an absent method hides its action). Errors stay `HttpErrorResponse`. |
| `standardDataSource(config)` | The `CrudDataSource` for any backend that follows the standards, over `HttpClient`. Call in an injection context. |
| `createCrudList(dataSource, options?)` | List controller on `rxResource`: page-token stack, `orderBy`, filters, page size, selection, latest-request-wins, `reload()`. |
| `problemToFormErrors(error, form)` | Takes the `HttpErrorResponse`; when it is a problem, puts `errors[].pointer` (RFC 6901) on the matching controls as `{ server: string[] }` and the rest on the form. Returns `false` otherwise. |
| `crudErrorKind(error)` | `'conflict'` (412), `'problem'` (other 4xx that is a problem) or `'other'`. |
| `ProblemFieldError` | The shape of the `errors` extension (`{ pointer?, detail }`), read as `Problem<{ errors?: readonly ProblemFieldError[] }>`. |
| `fileNameFrom(response)` | File name from `Content-Disposition` (RFC 6266/8187) via the `content-disposition` package. |
| `IdempotencyKey`, `crudFeatures()` | One key per submit attempt; which optional methods a data source has. |

A response is a problem when its `Content-Type` media type is `application/problem+json` (RFC 9457 §3; case-insensitive, parameters such as `charset` ignored) and its body is an object, not when the body merely looks like one. The check is `problemOf` from `@rn-forge/ng/core`. A 422 `application/json` body with `errors` is `'other'` and leaves the form untouched, so the backend must send the problem media type.

```ts
readonly dataSource = standardDataSource<Order, OrderInput, string>({
  baseUrl: inject(ORDERS_API_URL), // app-owned token
  collection: '/orders',
  features: { batchDelete: true, import: true, export: ['text/csv'] },
});
```

A backend with its own shape (a DRF envelope, a pre-standard API) implements
`CrudDataSource` itself and maps to this contract in the app; ngkit ships no
such adapter. Saving a downloaded file stays `AppUtil.saveBlob` in `ng/core`.
