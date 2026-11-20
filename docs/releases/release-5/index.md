# Release 5

|  |  |
| -- | -- |
| **Status** | shipped |
| **Start Date** | 2026-11-18 |
| **Finish Date** | 2026-11-20 |

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
| [F6.1 — `loadingTimings`](../../specs/epics/E6-asynchronous-resource/F6.1-loading-timings.md) | E6 | Closed |
| [F19.1 — Short records and disposable build briefs](../../specs/epics/E19-ngkit-simplification/F19.1-specs-and-briefs.md) | E19 | Closed |
| [F19.2 — One current explanation per audience](../../specs/epics/E19-ngkit-simplification/F19.2-current-documentation.md) | E19 | Closed |
| [F19.3 — Behavioral coverage and measured simplification](../../specs/epics/E19-ngkit-simplification/F19.3-behavioral-baselines.md) | E19 | Closed |
| [F19.4 — Bounded stream and permission-view lifetimes](../../specs/epics/E19-ngkit-simplification/F19.4-core-and-permissions.md) | E19 | Closed |
| [F19.5 — Configuration and widgets with explicit owners](../../specs/epics/E19-ngkit-simplification/F19.5-configuration-and-widgets.md) | E19 | Closed |
| [F19.6 — Forms and CRUD preserve application values](../../specs/epics/E19-ngkit-simplification/F19.6-forms-and-crud.md) | E19 | Closed |
| [F19.7 — Settings notifications with consumer lifetimes](../../specs/epics/E19-ngkit-simplification/F19.7-settings-lifetimes.md) | E19 | Closed |
| [F19.8 — Executable package boundaries and consumer contracts](../../specs/epics/E19-ngkit-simplification/F19.8-boundaries-and-consumers.md) | E19 | Closed |

<!-- END derived scope -->

## Decisions

- [E19](../../specs/epics/E19-ngkit-simplification/index.md) and
  [F6.1](../../specs/epics/E6-asynchronous-resource/F6.1-loading-timings.md)
  are scheduled into Release 5 (owner decision, 2026-11-18).

## Breaking changes

E19 preserves public imports, wire formats and optional features; an intentional
contract change gets explicit acceptance, a changelog entry and a versioning
assessment
([E19](../../specs/epics/E19-ngkit-simplification/index.md#scope-constraints)).
The release must announce:

- `@rn-forge/ng-bootstrap/form`: `MultiTypeaheadFieldComponent` no longer
  exposes `onChange`, `onTouched`, `writeValue`, `registerOnChange`,
  `registerOnTouched` or `setDisabledState`. They were never connected to
  Angular forms; the field now reads and writes its control in the parent
  `FormGroup`
  ([S19.6.3](../../specs/epics/E19-ngkit-simplification/F19.6-forms-and-crud.md#s1963-wire-multi-typeahead-to-one-reactive-form-value)).
  Pre-1.0, so it ships in the next minor.

Behaviour changes, to list as fixes: a CRUD form submission keeps `0` and
`false`, and sends arrays, dates and objects without an `id` unchanged instead
of dropping them
([S19.6.1](../../specs/epics/E19-ngkit-simplification/F19.6-forms-and-crud.md#s1961-serialize-values-without-truthiness-loss)).

Additive, to list as features: `UserSettingsService.registerChangeListener`
returns a disposer
([S19.7.1](../../specs/epics/E19-ngkit-simplification/F19.7-settings-lifetimes.md#s1971-release-settings-observers-with-their-views)).

## Progress

F6.1 and F19.1–F19.8 closed 2026-11-18, closing E19, and reached `main` in pull
request #28. The release was cut as `v0.6.0` (`task version -- minor` on
`chore/release-5-cut`). Pull request #30 merged 2026-11-20 as `7d6facd`, and
Release 5 shipped as `v0.6.0`: the `main` run (44677743004) passed, including
`release` and `verify-release`, and the GitHub Release was published with the
tarballs of all four `publishable` projects. E19 closed 2026-11-18; E6 stays
active with its remaining feature. Nothing remains.

## Commits

```console
$ git log --oneline -E --grep 'F19\.[0-9]|S19\.[0-9]\.[0-9]|F6\.1|S6\.1\.[0-9]'
6fedeac Merge pull request #28 from rn-forge/feature/release-5
aed6efb S19.2.1; F19.2 and E19 closed
5eea003 S19.2.2
a5e24ed Brief: S19.2.1
4502c8e Brief: S19.2.2
7373431 S19.8.2; F19.8 closed
9abf05f S19.5.1; F19.5 closed
fb2fc23 Brief: S19.8.2
6476666 S19.6.2; F19.6 closed
3be2611 S19.6.1
7ad2b65 Brief: S19.5.1
031ac3a Brief: S19.6.2
67d70cc S19.7.2; F19.7 closed
50f0020 Brief: S19.6.1
0e845e7 S19.8.1
b3151a7 S19.3.2; F19.3 closed
7abba6f S19.3.2 harness and results (brief kept for history)
bfd1392 S19.6.3
ea9081a S19.5.2
9d331fa Brief: S19.7.2
61a32e8 Brief: S19.8.1
dbc5294 Brief: S19.6.3
e547f79 Brief: S19.5.2
2b55a99 S19.7.1
16e15df S19.4.1; F19.4 closed
21a3b92 S19.4.2
2b6e70e Brief: S19.7.1
93394e0 Brief: S19.4.2
66227b3 Brief: S19.4.1
91d9713 S19.3.1
4e0d8b1 Briefs: S19.3.1, S19.3.2
8b1e60a S19.1.2; F19.1 closed
48e181a Brief: S19.1.2
9278590 S6.1.2; F6.1 closed
51d94ce Brief: S6.1.2
508e700 S6.1.1
973ee6a S19.1.1
f8583d6 Briefs: S6.1.1, S19.1.1
282f4f2 F6.1: minDuration option, default 0 (owner decision)
3038497 Release 5: plan; E19 and F6.1 in scope
```

## Exit criteria

- F19.1–F19.8 and F6.1 are done.
- The tag exists and the GitHub Release exists with the tarball of every
  `publishable` project.
- `CHANGELOG.md` has an entry for the version.
- `verify-consumer` passes on the released tarballs.

## Shipped

| Deliverable | Version | Tag | Commit | Verification |
| -- | -- | -- | -- | -- |
| `@rn-forge/ng` | `0.6.0` | `v0.6.0` | `7d6facd` | `rn-forge-ng-0.6.0.tgz` attached to the published GitHub Release [v0.6.0](https://github.com/rn-forge/ngkit/releases/tag/v0.6.0) (2026-11-20T05:11:34Z) |
| `@rn-forge/ng-bootstrap` | `0.6.0` | `v0.6.0` | `7d6facd` | `rn-forge-ng-bootstrap-0.6.0.tgz` attached to the published GitHub Release [v0.6.0](https://github.com/rn-forge/ngkit/releases/tag/v0.6.0) (2026-11-20T05:11:34Z); the tarball declares `@rn-forge/ng` as `^0.6.0` |
| `@rn-forge/ng-tailwind` | `0.6.0` | `v0.6.0` | `7d6facd` | `rn-forge-ng-tailwind-0.6.0.tgz` attached to the published GitHub Release [v0.6.0](https://github.com/rn-forge/ngkit/releases/tag/v0.6.0) (2026-11-20T05:11:34Z) |
| `@rn-forge/ng-plugin` | `0.6.0` | `v0.6.0` | `7d6facd` | `rn-forge-ng-plugin-0.6.0.tgz` attached to the published GitHub Release [v0.6.0](https://github.com/rn-forge/ngkit/releases/tag/v0.6.0) (2026-11-20T05:11:34Z); `verify-release` passed in `main` run 44677743004 |
