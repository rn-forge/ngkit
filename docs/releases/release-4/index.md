# Release 4

|  |  |
| -- | -- |
| **Status** | planned |

[Back to releases](../index.md) · [Releasing](../../runbooks/releasing.md)

Release 4 carries the rest of E5, the session client and its Bootstrap auth UI
accepted against a FastAPI backend (F5.2, F5.3, F5.4), and F11.1, the
`@rn-forge/ng-plugin` package.
[F5.5](../../specs/epics/E5-session-client-auth/F5.5-situational-client-extensions.md)
stays deferred.

## Entry criteria

[Release 3](../release-3/index.md) has shipped, and the owner approves. F5.4's
entry criterion is met: the released server libraries `rn-forge-fastapi` v0.4.1
and `rn-forge-django` v0.6.1 serve the auth contract (observed 2026-11-14).

## Scope

<!-- BEGIN derived scope -->

| Feature | Epic | State |
| -- | -- | -- |
| [F5.2 — `@rn-forge/ng/auth` session client](../../specs/epics/E5-session-client-auth/F5.2-auth-wrapper.md) | E5 | Closed |
| [F5.3 — Bootstrap auth UI](../../specs/epics/E5-session-client-auth/F5.3-bootstrap-auth-ui.md) | E5 | Closed |
| [F5.4 — Acceptance against a session backend](../../specs/epics/E5-session-client-auth/F5.4-auth-acceptance.md) | E5 | Active |
| [F11.1 — `@rn-forge/ng-plugin`](../../specs/epics/E11-workspace-generators/F11.1-ng-plugin.md) | E11 | Closed |

<!-- END derived scope -->

## Decisions

- [E11](../../specs/epics/E11-workspace-generators/index.md#decisions) (owner
  decision, 2026-10-17): the new `@rn-forge/ng-plugin` package joins the
  [ADR-0003](../../adr/ADR-0003.md) fixed group, tagged `publishable`.
- [F11.1](../../specs/epics/E11-workspace-generators/F11.1-ng-plugin.md#decisions)
  (owner decisions, 2026-11-17): `setup` adds the `@angular/localize/init`
  polyfill; a package's peers are also its `devDependencies`, so pnpm writes a
  lockfile importer for it.
- The production audit ignores GHSA-fc5q-39xc-vjpf (`picomatch`, no patched
  release) until a fix ships (owner decision, 2026-11-17;
  [F12.12](../../specs/epics/E12-on-demand-features/index.md#f1212-remove-the-picomatch-audit-exception)).

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

F5.2 and F5.3 closed 2026-11-15. F5.4's stories closed 2026-11-16; the feature
waits on its acceptance runs in CI. F11.1 closed 2026-11-17: the
`@rn-forge/ng-plugin` package with six generators (`setup`,
`add-bootstrap-table`, `configure-theme`, `scaffold-component`,
`create-library`, `configure-testing`). E11 closes when the package releases
with the group.

## Commits

```console
$ git log --oneline -E --grep 'F5\.[0-9]|S5\.[0-9]\.[0-9]|F11\.[0-9]|S11\.[0-9]\.[0-9]'
(not refreshed until the cut)
```

## Exit criteria

- F5.2, F5.3 and F5.4 are done.
- F11.1 is done, and `@rn-forge/ng-plugin` releases with the group.
- The tag exists and the GitHub Release exists with the tarball of every
  `publishable` project.
- `CHANGELOG.md` has an entry for the version.
- `verify-consumer` passes on the released tarballs.
