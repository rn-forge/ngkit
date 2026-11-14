# Release 3

|  |  |
| -- | -- |
| **Status** | in progress |
| **Start Date** | 2026-11-03 |

[Back to releases](../index.md) · [Releasing](../../runbooks/releasing.md)

## Entry criteria

[Release 2](../release-2/index.md) has shipped, and the owner approves.

## Scope

<!-- BEGIN derived scope -->

| Feature | Epic | State |
| -- | -- | -- |
| [F5.1 — Client model and wire contract](../../specs/epics/E5-session-client-auth/F5.1-client-model.md) | E5 | New |
| [F5.2 — `@rn-forge/ng/auth` session client](../../specs/epics/E5-session-client-auth/F5.2-auth-wrapper.md) | E5 | New |
| [F5.3 — Bootstrap auth UI](../../specs/epics/E5-session-client-auth/F5.3-bootstrap-auth-ui.md) | E5 | New |
| [F5.4 — Acceptance against a session backend](../../specs/epics/E5-session-client-auth/F5.4-auth-acceptance.md) | E5 | New |
| [F11.1 — `@rn-forge/ng-plugin`](../../specs/epics/E11-workspace-generators/F11.1-ng-plugin.md) | E11 | Active |
| [F17.1 — The docs follow kiln's work model](../../specs/epics/E17-kiln-adoption/F17.1-docs-model.md) | E17 | Active |
| [F17.2 — Cut over onto kiln](../../specs/epics/E17-kiln-adoption/F17.2-cutover.md) | E17 | Closed |
| [F17.3 — The instruction files follow kiln's standard](../../specs/epics/E17-kiln-adoption/F17.3-instructions-follow-kiln-standard.md) | E17 | Removed |
| [F17.4 — Asset subpaths are declared in source](../../specs/epics/E17-kiln-adoption/F17.4-asset-exports.md) | E17 | New |
| [F17.5 — The consumer checks run from `kiln-devops`](../../specs/epics/E17-kiln-adoption/F17.5-consumer-checks-in-kiln.md) | E17 | New |

<!-- END derived scope -->

E5 and F11.1 moved here from Release 2 (owner decision, 2026-10-25): E5 will be
refined further once a released server library's auth module is defined, and
F11.1 is picked up after ngkit is cut over to kiln
([E17](../../specs/epics/E17-kiln-adoption/index.md), added to this release
2026-11-02).
[F5.5](../../specs/epics/E5-session-client-auth/F5.5-situational-client-extensions.md)
stays deferred; each extension becomes a story only when an application needs
it. F5.4 cannot start until a released server library serves the auth routes
(its entry criterion).

## Decisions

- [ADR-0006](../../adr/ADR-0006.md): the browser holds a backend session, never
  a token. Proposed; accepted by
  [S5.1.1](../../specs/epics/E5-session-client-auth/F5.1-client-model.md).
- [E11 Decisions](../../specs/epics/E11-workspace-generators/index.md#decisions)
  (owner decision, 2026-10-17): the new `@rn-forge/ng-plugin` package joins
  the [ADR-0003](../../adr/ADR-0003.md) fixed group, tagged `publishable`.

## Breaking changes

Expected, from [E5](../../specs/epics/E5-session-client-auth/index.md) (the
release must announce them):

- `@rn-forge/ng/auth`: the configuration (`provideRnForgeAuthConfig`,
  `RnForgeAuthConfig`, `RN_FORGE_AUTH_CONFIG_TOKEN`, replaced by
  `provideRnForgeAuth`), the credentials types and services (`LoginResponse`,
  `UserProfile`, `JwtCredentials`, `JwtToken`, the `refreshToken` hook,
  `disableAuth`), the guard (`authRouteGuard`, `ignoreAppRoutes`, replaced by
  `authGuard` and `permissionGuard`), and the `jwt-decode` dependency.
- `@rn-forge/ng-bootstrap/auth`: the whole surface, including `AuthComponent`'s
  login and logout modes and `UserComponent`'s use of `UserProfile`.

None from F11.1: a new package is not a break.

## Progress

Started 2026-11-03 on `feature/release-3` with F17.1 (owner decision): the owner
agreed S17.1.1's mapping as written, and S17.1.2's conversion is under way.
F17.1 runs ahead of S17.2.1 and kiln's release-1 tag, so the `kiln` commands its
acceptance needs (`task docs:generate`, `kiln doctor`) run once `init` has
written `.rn-forge/kiln/config.toml`. E5 starts with the S5.1.1 decision (accept
ADR-0006) once a released server library's auth module is defined; F5.4 waits
for a released server library serving the auth routes. F11.1 starts after ngkit
is cut over to kiln. Revised 2026-11-07 (owner decision, recorded in kiln's
S7.2.4): the cutover runs on `feature/kiln-cutover`, cut from and merged back
into `feature/release-3`, before kiln tags `v0.1.0`, with
`[kiln] ref = "feature/v1"`; the pre-cutover stories (S17.2.6, S17.1.5, S17.2.7)
land first, then S17.2.1. Revised 2026-11-14 (owner decision): the pin stays on
`feature/v1` and Release 3 does not wait for a kiln tag.

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
