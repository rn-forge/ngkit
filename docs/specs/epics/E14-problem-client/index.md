# E14 — RFC 9457 problem client support

**Status:** done · **Implemented:** 2026-10-24 · **Owner:** ngkit · **Release:** [Release 2](../../../releases/release-2/index.md)

**Source:** owner request, 2026-10-21, revised 2026-10-23: an application rewrite on the current published release reads RFC 9457 problems from its backend, and builds the pieces in the application first so they can be swapped for these later. Revised so that ngkit types only what RFC 9457 defines and leaves Angular's error type unchanged.

Types and pure helpers for backends that answer errors with `application/problem+json` ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)): a `Problem` typed with the members the RFC defines, `problemOf` to read one from an `HttpErrorResponse`, `problemMessage` for the text a screen shows, and `problemTypeOf` / `hasProblemType` to match on the problem `type` URI. They work the same on an `HttpClient` call's error and on `httpResource().error()`, so an application replaces per-service body parsing with one call and no registration.

It is **not** the client [E2](../E2-retire-http-entry-point/index.md) rejected: no client, no base URL, no verbs, no retries and no interceptor ([ADR-0004](../../../adr/ADR-0004.md)).

[Back to the board](../../index.md)

| Feature                                                        | Status  | Scope                                                                                                        |
| -------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| [F14.1 — `Problem` and its helpers](F14.1-problem-types.md)    | planned | The ADR-0004 decision, the `Problem` type, `problemOf`, `problemMessage`, `problemTypeOf`, `hasProblemType`. |
| [F14.2 — `ng/crud` and the HTTP guide](F14.2-crud-adoption.md) | planned | `ng/crud` and `ng-bootstrap/crud` read problems through the core helpers; the HTTP guide shows them.         |

## Placement

**In `@rn-forge/ng/core`, not a new entry point.**

- Adding an entry point costs a `verify-consumer` matrix cell, a test include and a coverage include ([Adding a secondary entry point](../../../guides/development.md#adding-a-secondary-entry-point)). It is worth it when a package boundary or an optional peer needs isolating ([ADR-0002](../../../adr/ADR-0002.md)). Neither applies: the code needs only `@angular/common`, which `core` already peers on ([ADR-0001](../../../adr/ADR-0001.md) principle 3).
- `@rn-forge/ng/crud` already has `ProblemDetails` and `problemOf`, and `crud` imports `core`. Moving them to `core` gives one home; a new `problem` entry point would be a third place for the same shape.
- A new entry point named `http` would revive the name [E2](../E2-retire-http-entry-point/index.md) removed, and read as the client it rejected.

## Design

**Only the standard.** ngkit types the five members RFC 9457 defines (`type`, `title`, `status`, `detail`, `instance`). A response is a problem when its media type is `application/problem+json` (RFC 9457 §3), not when its body has a familiar shape. Extension members are reachable through an index signature and a generic parameter; ngkit gives none of them a meaning in `core`. A machine-readable error code is the problem `type` URI, which is what RFC 9457 §3.1.1 makes it; an application matches on `type`, not on a `code` member. Trace correlation travels in the W3C Trace Context `traceresponse` header and belongs to the telemetry layer ([F12.1](../E12-on-demand-features/index.md#f121--telemetry-entry-point)), not to the problem body.

The one extension ngkit reads is `errors`, in `ng/crud` only, because `problemToFormErrors` maps it onto form controls. Its shape, `{ pointer, detail }[]` with RFC 6901 pointers, is the validation example RFC 9457 §3 gives.

**Errors pass through unchanged** ([ADR-0001](../../../adr/ADR-0001.md)). The helpers read an `HttpErrorResponse`; nothing replaces it, so `instanceof HttpErrorResponse`, existing interceptors and `ng-bootstrap` keep working. A wrapping `ApiError` class and a rethrowing interceptor were considered and rejected: with no extension members to carry, `ApiError` would be a renamed `HttpErrorResponse`, and replacing Angular's error type breaks every reader of it to save one function call.

**Adoption.** Once released, applications that parse problem bodies themselves, and the Angular app the repository-level generator seeds, replace that code with these helpers.

## Open questions

- **`Blob` error bodies.** A download that fails with `responseType: 'blob'` carries a `Blob`, not an object. The first version treats it as no problem (`problemMessage` falls back to the status); reading the blob asynchronously is a later addition if an application needs it.
