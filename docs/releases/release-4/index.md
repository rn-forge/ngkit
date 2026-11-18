# Release 4

|  |  |
| -- | -- |
| **Status** | shipped |
| **Start Date** | 2026-11-15 |
| **Finish Date** | 2026-11-18 |

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
| [F5.4 — Acceptance against a session backend](../../specs/epics/E5-session-client-auth/F5.4-auth-acceptance.md) | E5 | Closed |
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

F5.2 and F5.3 closed 2026-11-15. F5.4's stories closed 2026-11-16, and the
feature closed 2026-11-17 with its acceptance green on both CI paths and locally
against Django. F11.1 closed 2026-11-17: the `@rn-forge/ng-plugin` package with
six generators (`setup`, `add-bootstrap-table`, `configure-theme`,
`scaffold-component`, `create-library`, `configure-testing`). The release was
cut as `v0.5.0` (`task version -- minor` on `chore/release-4-cut`). Pull request
#26 merged 2026-11-18 as `d1a0180`, and Release 4 shipped as `v0.5.0`: the
`main` run (44246400078) passed, including `release` and `verify-release`, and
the GitHub Release was published with the tarballs of all four `publishable`
projects. E11 closed 2026-11-18, when `@rn-forge/ng-plugin` released with the
group. Nothing remains.

## Commits

```console
$ git log --oneline -E --grep 'F5\.[0-9]|S5\.[0-9]\.[0-9]|F11\.[0-9]|S11\.[0-9]\.[0-9]'
fe78c92 Merge pull request #24 from rn-forge/feature/release-4
f5ff26d F5.4: close; acceptance green on both CI paths and locally with Django
b31c779 F11.1: close; Release 4 progress and decisions
9582907 S11.1.8
be2a27b S11.1.8: peers are also dev dependencies; brief
b3fe3c3 S11.1.5
4e9ea8c S11.1.5: brief
e703825 S11.1.7
304a4cc S11.1.7: brief
d7c5a64 S11.1.4
e66199b S11.1.4: brief
ce8278f S11.1.3
a0af7c7 S11.1.3: brief
b6a8e63 S11.1.2
c0847ce S11.1.2: brief
d61ad04 S11.1.1
1ad12b4 S11.1.1: brief; S11.1.6 re-confirmed with the localize polyfill
744eae3 F5.4: run atomized e2e-ci specs
99dfb7f S5.4.2: acceptance run
8cc0ae3 S5.4.2: brief
0101d85 S5.4.1: fixture auth
72cf84e S5.4.1: brief
babbd32 F5.3: closed
1c05ca7 S5.3.3: user menu and expiry warning
c6d29f3 S5.3.3: brief
63431ab S5.3.2: auth error and forbidden pages
3cd878f S5.3.2: brief
0271c14 S5.3.1: login page
4990d44 S5.3.1: brief
c3c2769 F5.2: closed
4220749 S5.2.5: testing provider
800c865 S5.2.5: brief
b829a7e S5.2.4: guards, refresh and expiry
9e6dd10 S5.2.4: brief
7002d1b S5.2.3: error policy
839ee30 S5.2.3: brief
995a2f2 S5.2.2: login and logout
f058f23 S5.2.2: brief
f8aaf74 S5.2.1: session client configuration and bootstrap
8e4f681 S5.2.1: brief
9edd409 Release 4: plan F5.2-F5.4 and F11.1
0a13aa8 Merge pull request #17 from rn-forge/feature/release-3
b6dd9f7 Release 3 scope: E17 and F5.1; F5.2-F5.4 and F11.1 to the backlog
d32df2b F5.1 close: accept ADR-0006, settle the E5 wire contract
9ef6f35 docs(specs): S17.1.2 - convert epics, features and stories to kiln's work model
0476583 Release 2: move E5 and F11.1 to Release 3
```

## Exit criteria

- F5.2, F5.3 and F5.4 are done.
- F11.1 is done, and `@rn-forge/ng-plugin` releases with the group.
- The tag exists and the GitHub Release exists with the tarball of every
  `publishable` project.
- `CHANGELOG.md` has an entry for the version.
- `verify-consumer` passes on the released tarballs.

## Shipped

| Deliverable | Version | Tag | Commit | Verification |
| -- | -- | -- | -- | -- |
| `@rn-forge/ng` | `0.5.0` | `v0.5.0` | `d1a0180` | `rn-forge-ng-0.5.0.tgz` attached to the published GitHub Release [v0.5.0](https://github.com/rn-forge/ngkit/releases/tag/v0.5.0) (2026-11-18T05:56:43Z) |
| `@rn-forge/ng-bootstrap` | `0.5.0` | `v0.5.0` | `d1a0180` | `rn-forge-ng-bootstrap-0.5.0.tgz` attached to the published GitHub Release [v0.5.0](https://github.com/rn-forge/ngkit/releases/tag/v0.5.0) (2026-11-18T05:56:43Z); the tarball declares `@rn-forge/ng` as `^0.5.0` |
| `@rn-forge/ng-tailwind` | `0.5.0` | `v0.5.0` | `d1a0180` | `rn-forge-ng-tailwind-0.5.0.tgz` attached to the published GitHub Release [v0.5.0](https://github.com/rn-forge/ngkit/releases/tag/v0.5.0) (2026-11-18T05:56:43Z) |
| `@rn-forge/ng-plugin` | `0.5.0` | `v0.5.0` | `d1a0180` | `rn-forge-ng-plugin-0.5.0.tgz` attached to the published GitHub Release [v0.5.0](https://github.com/rn-forge/ngkit/releases/tag/v0.5.0) (2026-11-18T05:56:43Z); `verify-release` passed in `main` run 44246400078 |
