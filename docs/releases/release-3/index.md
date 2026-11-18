# Release 3

|  |  |
| -- | -- |
| **Status** | shipped |
| **Start Date** | 2026-11-03 |
| **Finish Date** | 2026-11-14 |

[Back to releases](../index.md) · [Releasing](../../runbooks/releasing.md)

## Entry criteria

[Release 2](../release-2/index.md) has shipped, and the owner approves.

## Scope

<!-- BEGIN derived scope -->

| Feature | Epic | State |
| -- | -- | -- |
| [F5.1 — Client model and wire contract](../../specs/epics/E5-session-client-auth/F5.1-client-model.md) | E5 | Closed |
| [F17.1 — The docs follow kiln's work model](../../specs/epics/E17-kiln-adoption/F17.1-docs-model.md) | E17 | Closed |
| [F17.2 — Cut over onto kiln](../../specs/epics/E17-kiln-adoption/F17.2-cutover.md) | E17 | Closed |
| [F17.3 — The instruction files follow kiln's standard](../../specs/epics/E17-kiln-adoption/F17.3-instructions-follow-kiln-standard.md) | E17 | Removed |
| [F17.4 — Asset subpaths are declared in source](../../specs/epics/E17-kiln-adoption/F17.4-asset-exports.md) | E17 | Closed |
| [F17.5 — The consumer checks run from `kiln-devops`](../../specs/epics/E17-kiln-adoption/F17.5-consumer-checks-in-kiln.md) | E17 | Closed |

<!-- END derived scope -->

Release 3 is the kiln cutover release (owner decision, 2026-11-14): its scope is
[E17](../../specs/epics/E17-kiln-adoption/index.md) and
[F5.1](../../specs/epics/E5-session-client-auth/F5.1-client-model.md). F5.2,
F5.3, F5.4 and F11.1 moved to the backlog (owner decision, 2026-11-14), and
[F5.5](../../specs/epics/E5-session-client-auth/F5.5-situational-client-extensions.md)
stays deferred.

## Decisions

- [ADR-0006](../../adr/ADR-0006.md): the browser holds a backend session, never
  a token. Accepted 2026-11-14 by
  [S5.1.1](../../specs/epics/E5-session-client-auth/F5.1-client-model.md).

## Breaking changes

None expected. For consumers:

- Internal peers publish as a caret range on the released version
  ([ADR-0003](../../adr/ADR-0003.md), amended 2026-11-14).
- `@rn-forge/ng-bootstrap` declares its `./assets/*` export in source
  ([F17.4](../../specs/epics/E17-kiln-adoption/F17.4-asset-exports.md)). The
  published entry becomes a condition object,
  `{ "sass": "./assets/*.scss", "default": "./assets/*" }`, where it was a
  string. `default` is the old target, so every import that resolved before
  resolves to the same file; the `sass` condition only lets Sass add the
  `.scss` extension.

## Progress

Started 2026-11-03 on `feature/release-3` with F17.1 (owner decision): the owner
agreed S17.1.1's mapping as written, and S17.1.2's conversion is under way.
F17.1 runs ahead of S17.2.1 and kiln's release-1 tag, so the `kiln` commands its
acceptance needs (`task docs:generate`, `kiln doctor`) run once `init` has
written `.rn-forge/kiln/config.toml`. Revised 2026-11-07 (owner decision,
recorded in kiln's S7.2.4): the cutover runs on `feature/kiln-cutover`, cut from
and merged back into `feature/release-3`, before kiln tags `v0.1.0`, with
`[kiln] ref = "feature/v1"`; the pre-cutover stories (S17.2.6, S17.1.5, S17.2.7)
land first, then S17.2.1. Revised 2026-11-14 (owner decision): the pin stays on
`feature/v1` and Release 3 does not wait for a kiln tag. E5 started 2026-11-14
(owner decision): ADR-0006 is accepted and F5.1 is closed with the wire contract
settled against `rn-forge-fastapi` and `rn-forge-django`. The same day the owner
closed the scope as E17 and F5.1.

E17 closed 2026-11-14. Pull request #17 merged as `0a13aa8`; the first `main`
run (43667226164) succeeded and its `release` job logged
`Release mode: released (v0.3.0, npm tag latest)`; the docs site deployed. The
version is bumped to 0.4.0 (`task version -- minor`) on `chore/release-3-close`;
Pull request #22 merged 2026-11-14 and Release 3 shipped as `v0.4.0`. Nothing
remains.

## Commits

```console
$ git log --oneline -E --grep 'E17|F5\.1|S5\.1\.[0-9]|F17\.[0-9]|S17\.[0-9]+\.[0-9]+'
0a13aa8 Merge pull request #17 from rn-forge/feature/release-3
b6dd9f7 Release 3 scope: E17 and F5.1; F5.2-F5.4 and F11.1 to the backlog
d32df2b F5.1 close: accept ADR-0006, settle the E5 wire contract
1bea6da S17.5.3
271e1d1 Brief S17.5.3
86c8ad2 S17.5.2
b045808 F17.5 Active
d852c93 Brief S17.5.2
c856dbf S17.5.1
cec1d65 Brief S17.5.1
81e7878 S17.4.1
fb7bba1 F17.1 close S17.1.2 to S17.1.6, brief S17.4.1
0035837 Merge feature/kiln-cutover into feature/release-3
8de0a0c S17.2.5
f9ab2e1 S17.2.5 override minimatch 10.x to 11
31f6e27 S17.2.5 kiln apply: start-ci-run argument fix
59cbcf6 F17.2 close S17.2.1 to S17.2.4
7436798 F17.2 pin stays on feature/v1
c7bdf3c S17.2.3
09fe594 S17.2.1 nx
c85eb53 S17.2.1 legacy
9117dc1 S17.2.1 kiln
8a35e71 S17.2.1 docs
ccf27c3 S17.2.1 update
3a95c46 S17.2.11
136c0f6 S17.2.10
eaf9d36 F17.2 Refinement
8c392b6 F17.1, F17.3–F17.5
1ab7023 S17.2.9
70e1758 S17.2.6
ca3526e S17.2.7
8c37d84 S17.1.5
9ef6f35 docs(specs): S17.1.2 - convert epics, features and stories to kiln's work model
b126d75 E17 Elaboration
0476583 Release 2: move E5 and F11.1 to Release 3
```

## Exit criteria

- E17 is done: every feature is `Closed` or `Removed`, and its acceptance has
  been run.
- F5.1 is done, and ADR-0006 is `accepted`.
- The tag exists and the GitHub Release exists with the tarballs of `ng`,
  `ng-bootstrap` and `ng-tailwind`, the three `publishable` projects.
- `CHANGELOG.md` has an entry for the version.
- `verify-consumer` passes on the released tarballs.

## Shipped

| Deliverable | Version | Tag | Commit | Verification |
| -- | -- | -- | -- | -- |
| `@rn-forge/ng` | `0.4.0` | `v0.4.0` | `01e981f` | `rn-forge-ng-0.4.0.tgz` attached to the published GitHub Release [v0.4.0](https://github.com/rn-forge/ngkit/releases/tag/v0.4.0) (2026-11-15T04:42:57Z) |
| `@rn-forge/ng-bootstrap` | `0.4.0` | `v0.4.0` | `01e981f` | `rn-forge-ng-bootstrap-0.4.0.tgz` attached to the published GitHub Release [v0.4.0](https://github.com/rn-forge/ngkit/releases/tag/v0.4.0) (2026-11-15T04:42:57Z) |
| `@rn-forge/ng-tailwind` | `0.4.0` | `v0.4.0` | `01e981f` | `rn-forge-ng-tailwind-0.4.0.tgz` attached to the published GitHub Release [v0.4.0](https://github.com/rn-forge/ngkit/releases/tag/v0.4.0) (2026-11-15T04:42:57Z) |
