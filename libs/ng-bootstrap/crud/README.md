# @rn-forge/ng-bootstrap/crud

Secondary entry point of `@rn-forge/ng-bootstrap`. It can be used by importing from `@rn-forge/ng-bootstrap/crud`.

`AbstractCrudManager` renders a `CrudDataSource` (from `@rn-forge/ng/crud`) in
`CrudComponent`: list, add/update, delete, import and export. It holds no data
logic. Paging, `orderBy`, filters and selection come from `createCrudList()`;
server validation, 412 conflicts, `Idempotency-Key` and file names come from the
same entry point. See [`libs/ng/crud/README.md`](https://github.com/rn-forge/ngkit/blob/main/libs/ng/crud/README.md).

What the screen does:

- **Token paging, no numbered pages.** Previous/Next; the total shows only when
  the backend sends `totalSize`.
- **Sort** writes `orderBy`, only for columns marked `sortable`.
- **Filters** are named query parameters returned by `filterFields()`.
- **Server validation** lands on the form controls (`problemToFormErrors`).
- **412 on save** shows "Reload latest": the row is re-read for its new `ETag`
  and the user's edits are kept, never silently overwritten.
- **Create** sends an `Idempotency-Key`, reused on retry, renewed when the body
  changes.
- **Delete** uses `batchDelete` when the data source has it, else one `DELETE`
  per id.
- **Import is two steps**: *Validate* uploads with `validateOnly=true` and shows
  the report or the 422 row errors; *Import* commits. A 200 that lists errors is
  shown as a partial save.
- **Export** is a `GET` download with the current filters.

Import, export, template and batch actions are hidden when the data source has
no such method. Permission keys are `<permissionKey>.list|create|update|delete|import|export`
(the earlier `upload`/`download` keys are now `import`/`export`).

`AbstractCrudManager` exposes an abstract `dataSource`, an optional
`filterFields()`, and a protected `errorMessage(error)` hook (default: the
`detail`/`title` of an `application/problem+json` error, else the error's `message`). See
`apps/ng-demo/src/app/products/` for the canonical implementation
(`products.types.ts`, `products.manager.ts`, `products.page.*`) over
`standardDataSource()`.
