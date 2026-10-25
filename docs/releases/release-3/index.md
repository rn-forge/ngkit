# Release 3

**Status:** planned

[Back to releases](../index.md) · [Releasing](../../runbooks/releasing.md)

## Entry criteria

[Release 2](../release-2/index.md) has shipped, and the owner approves.

## Scope

| Feature                                                                                                         | Epic                                                       | Status      |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------- |
| [F5.1 — Client model and wire contract](../../specs/epics/E5-session-client-auth/F5.1-client-model.md)          | [E5](../../specs/epics/E5-session-client-auth/index.md)    | elaborating |
| [F5.2 — `@rn-forge/ng/auth` session client](../../specs/epics/E5-session-client-auth/F5.2-auth-wrapper.md)      | [E5](../../specs/epics/E5-session-client-auth/index.md)    | elaborating |
| [F5.3 — Bootstrap auth UI](../../specs/epics/E5-session-client-auth/F5.3-bootstrap-auth-ui.md)                  | [E5](../../specs/epics/E5-session-client-auth/index.md)    | elaborating |
| [F5.4 — Acceptance against a session backend](../../specs/epics/E5-session-client-auth/F5.4-auth-acceptance.md) | [E5](../../specs/epics/E5-session-client-auth/index.md)    | elaborating |
| [F11.1 — `@rn-forge/ng-plugin`](../../specs/epics/E11-workspace-generators/F11.1-ng-plugin.md)                  | [E11](../../specs/epics/E11-workspace-generators/index.md) | planned     |

E5 and F11.1 moved here from Release 2 (owner decision, 2026-10-25): E5 will be refined further once a released server library's auth module is defined, and F11.1 is picked up after ngkit is cut over to kiln. [F5.5](../../specs/epics/E5-session-client-auth/F5.5-situational-client-extensions.md) stays deferred; each extension becomes a story only when an application needs it. F5.4 cannot start until a released server library serves the auth routes (its entry criterion).

## Decisions

- [ADR-0006](../../adr/ADR-0006.md): the browser holds a backend session, never a token. Proposed; accepted by [S5.1.1](../../specs/epics/E5-session-client-auth/F5.1-client-model.md).
- [E11 Decisions](../../specs/epics/E11-workspace-generators/index.md#decisions) (owner decision, 2026-10-17): the new `@rn-forge/ng-plugin` package joins the [ADR-0003](../../adr/ADR-0003.md) fixed group, tagged `publishable`.

## Breaking changes

Expected, from [E5](../../specs/epics/E5-session-client-auth/index.md) (the release must announce them):

- `@rn-forge/ng/auth`: the configuration (`provideRnForgeAuthConfig`, `RnForgeAuthConfig`, `RN_FORGE_AUTH_CONFIG_TOKEN`, replaced by `provideRnForgeAuth`), the credentials types and services (`LoginResponse`, `UserProfile`, `JwtCredentials`, `JwtToken`, the `refreshToken` hook, `disableAuth`), the guard (`authRouteGuard`, `ignoreAppRoutes`, replaced by `authGuard` and `permissionGuard`), and the `jwt-decode` dependency.
- `@rn-forge/ng-bootstrap/auth`: the whole surface, including `AuthComponent`'s login and logout modes and `UserComponent`'s use of `UserProfile`.

None from F11.1: a new package is not a break.

## Progress

Not started. E5 starts with the S5.1.1 decision (accept ADR-0006) once a released server library's auth module is defined; F5.4 waits for a released server library serving the auth routes. F11.1 starts after ngkit is cut over to kiln.

## Commits

```console
$ git log --oneline -E --grep 'F5\.[0-9]|S5\.[0-9]\.[0-9]|F11\.[0-9]|S11\.[0-9]\.[0-9]'
(not refreshed until the cut)
```

## Exit criteria

- F5.1–F5.4 are done, and ADR-0006 is `accepted`.
- F11.1 is done, and `@rn-forge/ng-plugin` releases with the group.
- The tag exists and the GitHub Release exists with both tarballs.
- `CHANGELOG.md` has an entry for the version.
- `verify-consumer` passes on the released tarballs.
