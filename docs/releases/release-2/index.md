# Release 2

**Status:** planned

[Back to releases](../index.md) · [Releasing](../../runbooks/releasing.md)

## Entry criteria

[Release 1](../release-1/index.md) has shipped (`v0.2.0`), and the owner approves.

## Scope

| Feature                                                                                                                  | Epic                                                         | Status      |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ----------- |
| [F4.3 — Accept the screen against a real backend](../../specs/epics/E4-standard-resource-screen/F4.3-wire-acceptance.md) | [E4](../../specs/epics/E4-standard-resource-screen/index.md) | done        |
| [F5.1 — Client model and wire contract](../../specs/epics/E5-session-client-auth/F5.1-client-model.md)                   | [E5](../../specs/epics/E5-session-client-auth/index.md)      | elaborating |
| [F5.2 — `@rn-forge/ng/auth` session client](../../specs/epics/E5-session-client-auth/F5.2-auth-wrapper.md)               | [E5](../../specs/epics/E5-session-client-auth/index.md)      | elaborating |
| [F5.3 — Bootstrap auth UI](../../specs/epics/E5-session-client-auth/F5.3-bootstrap-auth-ui.md)                           | [E5](../../specs/epics/E5-session-client-auth/index.md)      | elaborating |
| [F5.4 — Acceptance against a session backend](../../specs/epics/E5-session-client-auth/F5.4-auth-acceptance.md)          | [E5](../../specs/epics/E5-session-client-auth/index.md)      | elaborating |
| [F8.1 — The package and its release wiring](../../specs/epics/E8-tailwind-package/F8.1-package.md)                       | [E8](../../specs/epics/E8-tailwind-package/index.md)         | done        |
| [F8.2 — Tokens, tones, base sheet and bridge](../../specs/epics/E8-tailwind-package/F8.2-css-contract.md)                | [E8](../../specs/epics/E8-tailwind-package/index.md)         | done        |
| [F8.3 — `rnfButton`](../../specs/epics/E8-tailwind-package/F8.3-button.md)                                               | [E8](../../specs/epics/E8-tailwind-package/index.md)         | done        |
| [F8.4 — Consumer and accessibility acceptance](../../specs/epics/E8-tailwind-package/F8.4-acceptance.md)                 | [E8](../../specs/epics/E8-tailwind-package/index.md)         | planned     |
| [F11.1 — `@rn-forge/ng-plugin`](../../specs/epics/E11-workspace-generators/F11.1-ng-plugin.md)                           | [E11](../../specs/epics/E11-workspace-generators/index.md)   | planned     |
| [F14.1 — `Problem` and its helpers](../../specs/epics/E14-problem-client/F14.1-problem-types.md)                         | [E14](../../specs/epics/E14-problem-client/index.md)         | done        |
| [F14.2 — `ng/crud` and the HTTP guide](../../specs/epics/E14-problem-client/F14.2-crud-adoption.md)                      | [E14](../../specs/epics/E14-problem-client/index.md)         | done        |
| [F15.1 — `createEventStream`](../../specs/epics/E15-event-stream/F15.1-event-stream.md)                                  | [E15](../../specs/epics/E15-event-stream/index.md)           | done        |
| [F16.1 — `Invalidation`](../../specs/epics/E16-resource-invalidation/F16.1-invalidation.md)                              | [E16](../../specs/epics/E16-resource-invalidation/index.md)  | done        |

Excluded: F11.2 (`@rn-forge/nx-plugin`) and F11.3 (`create-rn-forge-ng-workspace`) are retired (owner decision, 2026-10-17): kiln owns repository-level setup ([E11](../../specs/epics/E11-workspace-generators/index.md)). [F5.5](../../specs/epics/E5-session-client-auth/F5.5-situational-client-extensions.md) is deferred; each extension becomes a story only when an application needs it. F5.4 cannot start until a released server library serves the auth routes (its entry criterion).

### Owner checks carried from Release 1

[F13.4](../../specs/epics/E13-portable-ci/F13.4-safe-release.md) is done; the owner deferred two of its checks to this release's cut (decision, 2026-10-16):

- S13.4.2's gate negative check: a `dry-run: false` release from a commit with no green `ci.yml` run fails at the gate before any version step.
- S13.4.4's resume rerun: delete a release's GitHub Release, keep the tag, and rerun **Release** from `main` with `dry-run: false`; it recreates the release with both tarballs and does not bump the version. Rerunning once more reports the version as already released and succeeds.

## Decisions

- [ADR-0006](../../adr/ADR-0006.md): the browser holds a backend session, never a token. Proposed; accepted by [S5.1.1](../../specs/epics/E5-session-client-auth/F5.1-client-model.md).
- [E11 Decisions](../../specs/epics/E11-workspace-generators/index.md#decisions) (owner decision, 2026-10-17): the new `@rn-forge/ng-plugin` package joins the [ADR-0003](../../adr/ADR-0003.md) fixed group, tagged `publishable`.
- [ADR-0004](../../adr/ADR-0004.md): amended by [S14.1.1](../../specs/epics/E14-problem-client/F14.1-problem-types.md) so `ng/core` types the RFC 9457 members and recognizes a problem by its media type. Accepted by the owner, 2026-10-24.

## Breaking changes

None from E8, E11, E15 or E16: a new package or new exports are not a break. Expected, from [E14](../../specs/epics/E14-problem-client/index.md) ([S14.2.1](../../specs/epics/E14-problem-client/F14.2-crud-adoption.md)):

- `@rn-forge/ng/crud`: `ProblemDetails` and `problemOf` are removed (use `Problem` and `problemOf` from `@rn-forge/ng/core`); `problemToFormErrors` and `crudErrorKind` take the `HttpErrorResponse`, not a bare body; a problem is recognized by the `application/problem+json` media type, not by body shape.

Expected, from [E5](../../specs/epics/E5-session-client-auth/index.md) (the release must announce them):

- `@rn-forge/ng/auth`: the configuration (`provideRnForgeAuthConfig`, `RnForgeAuthConfig`, `RN_FORGE_AUTH_CONFIG_TOKEN`, replaced by `provideRnForgeAuth`), the credentials types and services (`LoginResponse`, `UserProfile`, `JwtCredentials`, `JwtToken`, the `refreshToken` hook, `disableAuth`), the guard (`authRouteGuard`, `ignoreAppRoutes`, replaced by `authGuard` and `permissionGuard`), and the `jwt-decode` dependency.
- `@rn-forge/ng-bootstrap/auth`: the whole surface, including `AuthComponent`'s login and logout modes and `UserComponent`'s use of `UserProfile`.

## Progress

F4.3 is done (2026-10-17): the fixtures and e2e suite pass on both CI paths. The work adds test code only; no published library changes. The owner added E5 and E11 to this release (2026-10-17). E5 starts with the S5.1.1 decision (accept ADR-0006); F5.4 waits for a released server library. What remains for the cut: the two owner checks carried from Release 1, E5 and E11. E11 is planned: build F11.1. The owner retired F11.2 and F11.3 (2026-10-17) because kiln owns repository-level setup. The owner added E8 (`@rn-forge/ng-tailwind`) to this release (2026-10-24); F8.1 is done (2026-10-24): S8.1.1 (scaffold, metadata and peers), S8.1.2 (CSS exports and the packed artifact) and S8.1.3 (docs targets and rows). F8.2 is done (2026-10-24): S8.2.1, S8.2.2 (`tokens.css`), S8.2.3 (`base.css`) and S8.2.4 (`tailwind.css`). F8.3 is done (2026-10-24): S8.3.1 (`rnfButton`). The owner moved E14, E15 and E16 here from Release 3 (2026-10-24): F15.1 and F16.1 are done (2026-10-24) in `ng/core`, new exports only; the owner accepted the ADR-0004 amendment (S14.1.1) and F14.1 and F14.2 are done (2026-10-24), with the `ng/crud` breaking change above.

## Commits

```console
$ git log --oneline -E --grep 'F4\.3|S4\.3\.[0-9]|F5\.[0-9]|S5\.[0-9]\.[0-9]|F8\.[0-9]|S8\.[0-9]\.[0-9]|F11\.[0-9]|S11\.[0-9]\.[0-9]|F1[456]\.[0-9]|S1[456]\.[0-9]\.[0-9]'
(not refreshed until the cut)
```

## Exit criteria

- F4.3 is done.
- F5.1–F5.4 are done, and ADR-0006 is `accepted`.
- F8.1–F8.4 are done, and `@rn-forge/ng-tailwind` releases with the group.
- F11.1 is done, and `@rn-forge/ng-plugin` releases with the group.
- F14.1, F14.2, F15.1 and F16.1 are done, and the ADR-0004 amendment is accepted (done 2026-10-24).
- The two owner checks above have run and passed, or the owner has waived them.
- The tag exists and the GitHub Release exists with both tarballs.
- `CHANGELOG.md` has an entry for the version.
- `verify-consumer` passes on the released tarballs.
