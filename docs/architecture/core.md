# Core

Behavior of `@rn-forge/ng/core` worth stating beyond its doc comments.

## Browser storage

`LocalStorageService` (`libs/ng/core/src/lib/core.services.ts`) wraps Web Storage. It is hand-rolled under [ADR-0001](../adr/ADR-0001.md) exemption 1 (checked on npm 2026-09-23): `ngx-webstorage` returns `any` from `retrieve()` with no validation, reports no failure result and JSON-encodes every value, which would break raw-string keys that a pre-bootstrap script reads (such as a theme key). `@ngx-pwa/local-storage` is async IndexedDB, a different model. Nothing maintained covers explicit failure results over the Web Storage API.

### Public surface

Exported through the `core.services.ts` → `src/index.ts` barrel:

```ts
/** The Web Storage backing LocalStorageService; null when unavailable (SSR, blocked). */
export const RNF_BROWSER_STORAGE = new InjectionToken<Storage | null>('RnForgeBrowserStorage', {
  providedIn: 'root',
  factory: () => {
    try {
      // DOCUMENT from @angular/core. The getter can throw SecurityError.
      return inject(DOCUMENT).defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  },
});

export type StorageFailureReason =
  | 'unavailable' // token is null
  | 'security' // DOMException name 'SecurityError'
  | 'quota' // DOMException name 'QuotaExceededError' or 'NS_ERROR_DOM_QUOTA_REACHED'
  | 'malformed' // stored text is not valid JSON
  | 'invalid' // parsed JSON rejected by the caller's validator
  | 'unserializable' // JSON.stringify threw (cycle, BigInt) or returned undefined
  | 'unknown'; // anything else

export type StorageReadResult<T> =
  | { readonly status: 'found'; readonly value: T }
  | { readonly status: 'missing'; readonly value: T } // value is the fallback
  | {
      readonly status: 'failed';
      readonly value: T; // value is the fallback
      readonly reason: StorageFailureReason;
      readonly error?: unknown;
    };

export type StorageWriteResult = { readonly ok: true } | { readonly ok: false; readonly reason: StorageFailureReason; readonly error?: unknown };
```

These methods on `LocalStorageService` never throw:

| Method                                                                                              | Returns                     |
| --------------------------------------------------------------------------------------------------- | --------------------------- |
| `tryGet(key: string, fallback: string): …`                                                          | `StorageReadResult<string>` |
| `tryGetJSON<T>(key: string, options: { validate: (value: unknown) => value is T; fallback: T }): …` | `StorageReadResult<T>`      |
| `trySet(key: string, value: string): …`                                                             | `StorageWriteResult`        |
| `trySetJSON(key: string, value: unknown): …`                                                        | `StorageWriteResult`        |
| `tryRemove(key: string): …`                                                                         | `StorageWriteResult`        |

The common call is one line, `storage.tryGetJSON('lastVisit', { validate: isVisitRecord, fallback: null }).value`, while callers that must react to a failure can inspect `status` or `ok`. `validate` is required, so there is no cast from `{}` or `unknown` to `T`.

### Behavior

1. The service injects `RNF_BROWSER_STORAGE` once. No method references the global `localStorage`.
2. Key format is `${appName}.${key}`.
3. The strict methods (`get`, `getJSON`, `set`, `setJSON`, `remove`, `clearAll`) throw on failure. When the token is `null` they throw `Error('[rn-forge.ng.core] Browser storage is unavailable …')`.
4. `clearAll()` enumerates keys with `storage.length` / `storage.key(i)`, collecting them before removing, so a fake `Storage` works and removal can't skip entries. It removes only keys starting with `${appName}.`.
5. Errors are classified in one private function, checking `error.name`, never `instanceof DOMException` (jsdom and browsers differ).
6. Nothing is written to the console, and the service adds no dependencies.

`auth` and `ng-bootstrap` use the strict methods on purpose, so a failed auth-token write still throws rather than silently succeeding.

## Utilities

- **`DateUtil`:** `isoFormatUtc`, `fromTimestampLocal`, `diffDateLocal` (calendar-day, DST-safe) and `isValidDate` sit beside the older methods; the docs say which methods are local and which UTC.
- **`FormUtil`:** validators run on pristine non-empty values (there is no `dirty` gate). Empty means `null`, `undefined` or `''`, so `0` is a value; zero `min`, `max` and `decimalPlaces` are honoured. `DATE` rejects impossible calendar dates, and `notBefore`/`notAfter` offsets use local days. `DATE_RANGE(start?, end?)` is a pure group `ValidatorFn`, attached through the group's `validators`, reporting `{ dateRange }`.
- **`ObjectUtil.diff`:** scalars compare by strict equality (numbers, `0`/`1`, `false`/`true` and `null` versus a value conflict; `null` equals `undefined`); arrays and `Date`s compare structurally; an array versus an object conflicts; a missing key is distinguished from `undefined`.
- **`HtmlAttributesDirective`:** implements `ngOnChanges`; it re-applies on change and removes, through `Renderer2`, only the attributes it set that are absent from the next map.
- **`RouteService.navigateByUrl(url, extras?)`:** merges the caller's `NavigationExtras` over the defaults (`reload`, `replaceUrl: true`).
