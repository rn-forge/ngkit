## 0.2.0 (2026-10-14)

### 🩹 Fixes

- ⚠️  **release:** apply the version bump as given below 1.0.0 ([76f8901](https://github.com/rn-forge/ngkit/commit/76f8901))

### ⚠️  Breaking Changes

- **release:** apply the version bump as given below 1.0.0  ([76f8901](https://github.com/rn-forge/ngkit/commit/76f8901))
  Release 1 changes the public API.
  - @rn-forge/ng/http and /http/crud are removed (AbstractHTTPService, BackendService, HttpUtil, DownloadResponse, apiBasePath); use HttpClient.
  - AuthBackendService requires backend.baseUrl when used.
  - FormUtil validators run on pristine values; DATE_RANGE(start?, end?) is a group validator; the old DATE_RANGE(formGroup, …) form is removed.
  - ObjectUtil.diff compares scalars strictly and arrays and dates structurally.
  - CrudDataSource and its types moved from @rn-forge/ng-bootstrap/crud to @rn-forge/ng/crud and changed shape (AIP-158 lists; get, delete and Versioned added; count/next/previous/results, BulkDeleteResponse, UploadResponse and upload removed).
  - The ng-bootstrap/crud mode 'upload' is now 'import', and 'download' is removed (export is a direct GET).
  - The permission keys .upload/.download are now .import/.export.
  - The CRUD table renders one server page with token paging; there are no numbered pages.

### ❤️ Thank You

- Claude Opus 5.5
- Rohit Narayanan @rohitnarayanan

## 0.1.3 (2026-10-14)

### 🩹 Fixes

- resolve Sonar reliability and security issues on main ([2ed9b37](https://github.com/rn-forge/ngkit/commit/2ed9b37))

### ❤️ Thank You

- Claude Opus 5.5
- Rohit Narayanan @rohitnarayanan

## 0.1.2 (2026-08-04)

This was a version bump only, there were no code changes.
