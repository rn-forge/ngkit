# E3 — Core correctness

**Status:** done · **Implemented:** 2026-09-23 (`1f54842`) · **Owner:** ngkit

**Source:** former roadmap item H3.

Safe browser storage and correctness fixes to the core utilities, each a separate change with focused tests. The behavior is described in [Core](../../../architecture/core.md). CRUD and auth, which this work first covered, moved to [E4](../E4-standard-resource-screen/index.md) and [E5](../E5-oidc-client-auth/index.md); neither was fixed in place.

[Back to the board](../../index.md)

| ID   | Delivered                                                                                                                                                                                                                                                                                              | Implemented |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| F3.1 | Safe browser storage: the `RNF_BROWSER_STORAGE` token and the never-throwing `tryGet`, `tryGetJSON`, `trySet`, `trySetJSON` and `tryRemove` on `LocalStorageService`, with explicit failure results. `auth` and `ng-bootstrap` keep the strict methods on purpose.                                     | `1f54842`   |
| F3.2 | `DateUtil` (local versus UTC, calendar-day DST-safe differences), `FormUtil` (pristine validators, `DATE_RANGE` as a group validator), `ObjectUtil.diff` (strict scalar and structural comparison), `HtmlAttributesDirective` (`ngOnChanges`), and `RouteService.navigateByUrl` merging caller extras. | `1f54842`   |

## Considered and rejected

- **`ngx-webstorage`** 22.0.0: maintained, but `retrieve()` returns `any` with no validation, it reports no failure result, and it JSON-encodes every value, which would break raw-string keys that a pre-bootstrap script reads (such as a theme key).
- **`@ngx-pwa/local-storage`:** async IndexedDB, a different model.

Verified with: `pnpm nx run-many -t lint test build --projects=ng,ng-bootstrap,ng-demo`, `pnpm nx run-many -t pack --projects=ng,ng-bootstrap`, `node tools/scripts/verify-dist-manifests.mjs`, `pnpm nx run ng:verify-consumer`.
