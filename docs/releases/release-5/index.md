# Release 5

|  |  |
| -- | -- |
| **Status** | planned |

[Back to releases](../index.md) · [Releasing](../../runbooks/releasing.md)

Release 5 carries E19, the ngkit simplification
([F19.1–F19.8](../../specs/epics/E19-ngkit-simplification/index.md)), and F6.1,
[loading timings](../../specs/epics/E6-asynchronous-resource/F6.1-loading-timings.md).

## Entry criteria

[Release 4](../release-4/index.md) has shipped as `v0.5.0` (2026-11-18), and the
owner approves.

## Scope

<!-- BEGIN derived scope -->

| Feature | Epic | State |
| -- | -- | -- |
| [F6.1 — `loadingTimings`](../../specs/epics/E6-asynchronous-resource/F6.1-loading-timings.md) | E6 | New |
| [F19.1 — Short records and disposable build briefs](../../specs/epics/E19-ngkit-simplification/F19.1-specs-and-briefs.md) | E19 | Active |
| [F19.2 — One current explanation per audience](../../specs/epics/E19-ngkit-simplification/F19.2-current-documentation.md) | E19 | New |
| [F19.3 — Behavioral coverage and measured simplification](../../specs/epics/E19-ngkit-simplification/F19.3-behavioral-baselines.md) | E19 | New |
| [F19.4 — Bounded stream and permission-view lifetimes](../../specs/epics/E19-ngkit-simplification/F19.4-core-and-permissions.md) | E19 | New |
| [F19.5 — Configuration and widgets with explicit owners](../../specs/epics/E19-ngkit-simplification/F19.5-configuration-and-widgets.md) | E19 | New |
| [F19.6 — Forms and CRUD preserve application values](../../specs/epics/E19-ngkit-simplification/F19.6-forms-and-crud.md) | E19 | New |
| [F19.7 — Settings notifications with consumer lifetimes](../../specs/epics/E19-ngkit-simplification/F19.7-settings-lifetimes.md) | E19 | New |
| [F19.8 — Executable package boundaries and consumer contracts](../../specs/epics/E19-ngkit-simplification/F19.8-boundaries-and-consumers.md) | E19 | New |

<!-- END derived scope -->

## Decisions

- [E19](../../specs/epics/E19-ngkit-simplification/index.md) and
  [F6.1](../../specs/epics/E6-asynchronous-resource/F6.1-loading-timings.md)
  are scheduled into Release 5 (owner decision, 2026-11-18).

## Breaking changes

None known yet. E19 preserves public imports, wire formats and optional
features; an intentional contract change gets explicit acceptance, a changelog
entry and a versioning assessment
([E19](../../specs/epics/E19-ngkit-simplification/index.md#scope-constraints)),
and would be listed here.

## Progress

Not started.

## Commits

```console
$ git log --oneline -E --grep 'F19\.[0-9]|S19\.[0-9]\.[0-9]|F6\.1|S6\.1\.[0-9]'
```

## Exit criteria

- F19.1–F19.8 and F6.1 are done.
- The tag exists and the GitHub Release exists with the tarball of every
  `publishable` project.
- `CHANGELOG.md` has an entry for the version.
- `verify-consumer` passes on the released tarballs.
