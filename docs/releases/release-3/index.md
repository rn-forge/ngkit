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

## Commits

```console
$ git log --oneline -E --grep 'F5\.[0-9]|S5\.[0-9]\.[0-9]|F11\.[0-9]|S11\.[0-9]\.[0-9]'
(not refreshed until the cut)
```

## Exit criteria

- E17 is done: every feature is `Closed` or `Removed`, and its acceptance has
  been run.
- F5.1 is done, and ADR-0006 is `accepted`.
- The tag exists and the GitHub Release exists with the tarballs of `ng`,
  `ng-bootstrap` and `ng-tailwind`, the three `publishable` projects.
- `CHANGELOG.md` has an entry for the version.
- `verify-consumer` passes on the released tarballs.
