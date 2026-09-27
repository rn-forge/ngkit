# Release 1

**Status:** planned

[Back to releases](../index.md) · [Releasing](../../runbooks/releasing.md)

## Entry criteria

Every scope story is done, and the owner approves.

## Scope

[E2](../../specs/epics/E2-retire-http-entry-point/index.md) and [E3](../../specs/epics/E3-core-correctness/index.md) by feature ID (F2.1–F2.3 and F3.1–F3.2; both predate stories), and from [E4](../../specs/epics/E4-standard-resource-screen/index.md):

- [S4.1.1–S4.1.5](../../specs/epics/E4-standard-resource-screen/F4.1-crud-entry-point.md)
- [S4.2.1–S4.2.2](../../specs/epics/E4-standard-resource-screen/F4.2-bootstrap-renderer-and-demo.md)

## Breaking changes to announce

1. `@rn-forge/ng/http` and `/http/crud` are removed (`AbstractHTTPService`, `BackendService`, `HttpUtil`, `DownloadResponse`, `apiBasePath`); use `HttpClient`.
2. `AuthBackendService` requires `backend.baseUrl` when used.
3. `FormUtil` validators run on pristine values; `DATE_RANGE(start?, end?)` is a group validator; the old `DATE_RANGE(formGroup, …)` form is removed.
4. `ObjectUtil.diff` compares scalars strictly and arrays and dates structurally.
5. `CrudDataSource` and its types moved from `@rn-forge/ng-bootstrap/crud` to `@rn-forge/ng/crud` and changed shape (AIP-158 lists; `get`, `delete` and `Versioned` added; `count`/`next`/`previous`/`results`, `BulkDeleteResponse`, `UploadResponse` and `upload` removed).
6. The `ng-bootstrap/crud` mode `'upload'` is now `'import'`, and `'download'` is removed (export is a direct `GET`).
7. The permission keys `.upload`/`.download` are now `.import`/`.export`.
8. The CRUD table renders one server page with token paging; there are no numbered pages.

How a breaking change reaches the changelog is in [Releasing](../../runbooks/releasing.md#2-breaking-changes).

## Exit criteria

- The tag exists.
- The GitHub Release exists with both tarballs.
- `CHANGELOG.md` has an entry that names each breaking change above.
- `verify-consumer` passes on the released tarballs.
