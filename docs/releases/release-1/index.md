# Release 1

**Status:** planned

[Back to releases](../index.md) · [Releasing](../../runbooks/releasing.md)

## Entry criteria

Every scope story is done, and the owner approves.

## Scope

| Feature                                                                                                                 | Epic                                                         | Status      |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------- |
| [F4.1 — CRUD entry point](../../specs/epics/E4-standard-resource-screen/F4.1-crud-entry-point.md)                       | [E4](../../specs/epics/E4-standard-resource-screen/index.md) | done        |
| [F4.2 — Bootstrap renderer and demo](../../specs/epics/E4-standard-resource-screen/F4.2-bootstrap-renderer-and-demo.md) | [E4](../../specs/epics/E4-standard-resource-screen/index.md) | done        |
| [F13.1 — Discovered projects](../../specs/epics/E13-portable-ci/F13.1-discovered-projects.md)                           | [E13](../../specs/epics/E13-portable-ci/index.md)            | done        |
| [F13.2 — One gate](../../specs/epics/E13-portable-ci/F13.2-one-gate.md)                                                 | [E13](../../specs/epics/E13-portable-ci/index.md)            | done        |
| [F13.3 — Docs job](../../specs/epics/E13-portable-ci/F13.3-docs-job.md)                                                 | [E13](../../specs/epics/E13-portable-ci/index.md)            | in progress |
| [F13.4 — Safe release](../../specs/epics/E13-portable-ci/F13.4-safe-release.md)                                         | [E13](../../specs/epics/E13-portable-ci/index.md)            | in progress |
| [F13.5 — Template contract](../../specs/epics/E13-portable-ci/F13.5-template-contract.md)                               | [E13](../../specs/epics/E13-portable-ci/index.md)            | done        |

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

E2, E3, F4.1–F4.2 and F13.1, F13.2 and F13.5 are done; the work is ready to merge. What remains can only happen on GitHub, after the merge, and is the shipping procedure: F13.3 is done once the docs site deploys from a push to `main`, and F13.4 once the first real release passes its owner-run checks (the gate, resume, `latest` and `published-install`). Running those checks is how release-1 is cut, so the entry criterion "every scope story is done" is met by the cut itself for those two features. F4.3 (the wire-acceptance e2e against a backend fixture) is not part of this release; it moved to [Release 2](../release-2/index.md).

## Commits

```console
$ git log --oneline -E --grep 'F4\.[12]|S4\.[12]\.[0-9]|F13\.[1-5]|S13\.[1-5]\.[0-9]'
d1e026c F13.5
8ca04d5 S13.5.3
e42730e S13.5.2
01a4fb5 S13.5.1
eae6647 S13.4.7
7c1ebe3 S13.4.6
84ed2d6 S13.4.5
60539a7 S13.4.4
90f5d56 S13.4.3
00ec2d4 S13.4.2
09e5886 S13.3.3
fb27a7d S13.3.2
6a5c1e7 F13.2
8751b19 S13.3.1
51c4b16 S13.2.5
9be0f47 S13.2.4
529b984 S13.2.3
add9264 S13.2.2
a87be28 S13.2.1
b41179f F13.1
43e5433 S13.1.5
b7b504c S13.1.4
fcb8899 S13.1.3
6493ba7 S13.1.2
aaa7bcb S13.1.1
```

F4.1 and F4.2 landed before commit subjects named story IDs, so they do not appear.

## Exit criteria

- The tag exists.
- The GitHub Release exists with both tarballs.
- `CHANGELOG.md` has an entry that names each breaking change above.
- `verify-consumer` passes on the released tarballs (evidence: the `published-install` job in `release.yml`).
