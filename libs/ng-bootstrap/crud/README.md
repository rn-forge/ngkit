# @rn-forge/ng-bootstrap/crud

Secondary entry point of `@rn-forge/ng-bootstrap`. It can be used by importing from `@rn-forge/ng-bootstrap/crud`.

`AbstractCRUDManager` implements the list / add / update / delete / upload /
download lifecycle for `CRUDComponent`; it needs a data contract for the
resource, which the application implements over native `HttpClient` (or a
generated OpenAPI client) — no ngkit transport base class is involved.

```ts
export interface CrudDataSource<$Q extends WriteModel<$K>, $S extends ReadModel<$K>, $K extends string | number = number> {
  list(params?: GenericType): Observable<ListResponse<$S>>;
  create(payload: $Q): Observable<$S>;
  update(id: $K, payload: $Q): Observable<$S>;
  bulkDelete(ids: $K[]): Observable<BulkDeleteResponse>;
  upload(fieldName: string): Observable<UploadResponse>;
  uploadTemplate(params?: GenericType): Observable<CrudFileDownload>;
  download(params?: GenericType): Observable<CrudFileDownload>;
}
```

`$K` (default `number`) is the resource's ID type — pass `string` for
resources with string IDs. `CrudFileDownload` is `{ blob, fileName }`; save it
with `AppUtil.saveBlob(blob, fileName)` from `@rn-forge/ng/core` (the manager
already does this for `downloadTemplate()`/`submitDownload()`).

`AbstractCRUDManager` exposes an abstract `get dataSource(): CrudDataSource<$Q, $S, $K>`
and a protected `errorMessage(response: HttpErrorResponse): string` hook
(default: `response.message`) — override it to read an application-specific
error body. See `apps/ng-demo/src/app/products/` for the canonical
implementation: `products.types.ts`, `products.service.ts` (the
`CrudDataSource`), `products.manager.ts` and `products.page.ts`.
