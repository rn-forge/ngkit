# Release 1

**Status:** planned

[Back to releases](../index.md) · [Releasing](../../runbooks/releasing.md)

## Entry criteria

Every scope story is done, and the owner approves.

## Scope

| Feature                                                                                                                 | Epic                                                         | Status  |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------- |
| [F4.1 — CRUD entry point](../../specs/epics/E4-standard-resource-screen/F4.1-crud-entry-point.md)                       | [E4](../../specs/epics/E4-standard-resource-screen/index.md) | done    |
| [F4.2 — Bootstrap renderer and demo](../../specs/epics/E4-standard-resource-screen/F4.2-bootstrap-renderer-and-demo.md) | [E4](../../specs/epics/E4-standard-resource-screen/index.md) | done    |
| [F13.1 — Discovered projects](../../specs/epics/E13-portable-ci/F13.1-discovered-projects.md)                           | [E13](../../specs/epics/E13-portable-ci/index.md)            | done    |
| [F13.2 — One gate](../../specs/epics/E13-portable-ci/F13.2-one-gate.md)                                                 | [E13](../../specs/epics/E13-portable-ci/index.md)            | planned |
| [F13.3 — Docs job](../../specs/epics/E13-portable-ci/F13.3-docs-job.md)                                                 | [E13](../../specs/epics/E13-portable-ci/index.md)            | planned |
| [F13.4 — Safe release](../../specs/epics/E13-portable-ci/F13.4-safe-release.md)                                         | [E13](../../specs/epics/E13-portable-ci/index.md)            | planned |
| [F13.5 — Template contract](../../specs/epics/E13-portable-ci/F13.5-template-contract.md)                               | [E13](../../specs/epics/E13-portable-ci/index.md)            | planned |

### Done before this release

| Epic                                                                                      | Delivered                                                                                                                             | Implemented            |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| [E2 — Retire the HTTP entry point](../../specs/epics/E2-retire-http-entry-point/index.md) | `@rn-forge/ng/http` and `/http/crud` removed with no aliases; `HttpClient` is the pattern                                             | 2026-09-23 (`c30d63a`) |
| [E3 — Core correctness](../../specs/epics/E3-core-correctness/index.md)                   | Safe browser storage and correctness fixes to `DateUtil`, `FormUtil`, `ObjectUtil.diff`, `HtmlAttributesDirective` and `RouteService` | 2026-09-23 (`1f54842`) |

## Decisions

- [ADR-0004](../../adr/ADR-0004.md): ngkit ships no HTTP client; applications use Angular's `HttpClient` (backs E2).
- [ADR-0005](../../adr/ADR-0005.md): the resource screen targets published wire standards, not a backend (backs E4).

## Breaking changes

1. `@rn-forge/ng/http` and `/http/crud` are removed (`AbstractHTTPService`, `BackendService`, `HttpUtil`, `DownloadResponse`, `apiBasePath`); use `HttpClient`.
2. `AuthBackendService` requires `backend.baseUrl` when used.
3. `FormUtil` validators run on pristine values; `DATE_RANGE(start?, end?)` is a group validator; the old `DATE_RANGE(formGroup, …)` form is removed.
4. `ObjectUtil.diff` compares scalars strictly and arrays and dates structurally.
5. `CrudDataSource` and its types moved from `@rn-forge/ng-bootstrap/crud` to `@rn-forge/ng/crud` and changed shape (AIP-158 lists; `get`, `delete` and `Versioned` added; `count`/`next`/`previous`/`results`, `BulkDeleteResponse`, `UploadResponse` and `upload` removed).
6. The `ng-bootstrap/crud` mode `'upload'` is now `'import'`, and `'download'` is removed (export is a direct `GET`).
7. The permission keys `.upload`/`.download` are now `.import`/`.export`.
8. The CRUD table renders one server page with token paging; there are no numbered pages.

How a breaking change reaches the changelog is in [Releasing](../../runbooks/releasing.md#2-breaking-changes).

## Progress

E2, E3 and E4's F4.1–F4.2 are done. E13 is in progress; F13.1 is done, F13.2 is next, and F13.4 (safe release) must be done before this release is cut, since release-1 is meant to ship by the verified release path E13 builds.

## Commits

```console
$ git log --oneline -E --grep 'F4\.[12]|S4\.[12]\.[0-9]|F13\.[1-5]'
(no matching commits yet — the remaining scope hasn't landed)
```

## Exit criteria

- The tag exists.
- The GitHub Release exists with both tarballs.
- `CHANGELOG.md` has an entry that names each breaking change above.
- `verify-consumer` passes on the released tarballs.
