# Release 2

**Status:** in progress

[Back to releases](../index.md) · [Releasing](../../runbooks/releasing.md)

## Entry criteria

[Release 1](../release-1/index.md) has shipped (`v0.2.0`), and the owner approves.

## Scope

| Feature                                                                                                                  | Epic                                                         | Status |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------ |
| [F4.3 — Accept the screen against a real backend](../../specs/epics/E4-standard-resource-screen/F4.3-wire-acceptance.md) | [E4](../../specs/epics/E4-standard-resource-screen/index.md) | done   |
| [F8.1 — The package and its release wiring](../../specs/epics/E8-tailwind-package/F8.1-package.md)                       | [E8](../../specs/epics/E8-tailwind-package/index.md)         | done   |
| [F8.2 — Tokens, tones, base sheet and bridge](../../specs/epics/E8-tailwind-package/F8.2-css-contract.md)                | [E8](../../specs/epics/E8-tailwind-package/index.md)         | done   |
| [F8.3 — `rnfButton`](../../specs/epics/E8-tailwind-package/F8.3-button.md)                                               | [E8](../../specs/epics/E8-tailwind-package/index.md)         | done   |
| [F8.4 — Consumer and accessibility acceptance](../../specs/epics/E8-tailwind-package/F8.4-acceptance.md)                 | [E8](../../specs/epics/E8-tailwind-package/index.md)         | done   |
| [F14.1 — `Problem` and its helpers](../../specs/epics/E14-problem-client/F14.1-problem-types.md)                         | [E14](../../specs/epics/E14-problem-client/index.md)         | done   |
| [F14.2 — `ng/crud` and the HTTP guide](../../specs/epics/E14-problem-client/F14.2-crud-adoption.md)                      | [E14](../../specs/epics/E14-problem-client/index.md)         | done   |
| [F15.1 — `createEventStream`](../../specs/epics/E15-event-stream/F15.1-event-stream.md)                                  | [E15](../../specs/epics/E15-event-stream/index.md)           | done   |
| [F16.1 — `Invalidation`](../../specs/epics/E16-resource-invalidation/F16.1-invalidation.md)                              | [E16](../../specs/epics/E16-resource-invalidation/index.md)  | done   |

Excluded: F11.2 (`@rn-forge/nx-plugin`) and F11.3 (`create-rn-forge-ng-workspace`) are retired (owner decision, 2026-10-17): kiln owns repository-level setup ([E11](../../specs/epics/E11-workspace-generators/index.md)). [F5.5](../../specs/epics/E5-session-client-auth/F5.5-situational-client-extensions.md) is deferred; each extension becomes a story only when an application needs it. E5 (F5.1–F5.4) and F11.1 moved to [Release 3](../release-3/index.md) (owner decision, 2026-10-25): E5 will be refined further once a released server library's auth module is defined, and F11.1 is picked up after ngkit is cut over to kiln.

### Owner checks carried from Release 1

[F13.4](../../specs/epics/E13-portable-ci/F13.4-safe-release.md) is done; the owner deferred two of its checks to this release's cut (decision, 2026-10-16):

- S13.4.2's gate negative check: a `dry-run: false` release from a commit with no green `ci.yml` run fails at the gate before any version step.
- S13.4.4's resume rerun: delete a release's GitHub Release, keep the tag, and rerun **Release** from `main` with `dry-run: false`; it recreates the release with both tarballs and does not bump the version. Rerunning once more reports the version as already released and succeeds.

## Decisions

- [ADR-0004](../../adr/ADR-0004.md): amended by [S14.1.1](../../specs/epics/E14-problem-client/F14.1-problem-types.md) so `ng/core` types the RFC 9457 members and recognizes a problem by its media type. Accepted by the owner, 2026-10-24.

## Breaking changes

None from E8, E15 or E16: a new package or new exports are not a break. Expected, from [E14](../../specs/epics/E14-problem-client/index.md) ([S14.2.1](../../specs/epics/E14-problem-client/F14.2-crud-adoption.md)):

- `@rn-forge/ng/crud`: `ProblemDetails` and `problemOf` are removed (use `Problem` and `problemOf` from `@rn-forge/ng/core`); `problemToFormErrors` and `crudErrorKind` take the `HttpErrorResponse`, not a bare body; a problem is recognized by the `application/problem+json` media type, not by body shape.

## Progress

All scope is done: F4.3 (2026-10-17), E8 (F8.1–F8.4, 2026-10-24), E14 (F14.1, F14.2), E15 (F15.1) and E16 (F16.1) (all 2026-10-24). What remains is the cut: the two owner checks carried from Release 1, the tag, the GitHub Release with both tarballs, the `CHANGELOG.md` entry and `verify-consumer` on the tarballs.

## Commits

```console
$ git log --oneline -E --grep 'F4\.3|S4\.3\.[0-9]|F8\.[0-9]|S8\.[0-9]\.[0-9]|F1[456]\.[0-9]|S1[456]\.[0-9]\.[0-9]'
(not refreshed until the cut)
```

## Exit criteria

- F4.3 is done.
- F8.1–F8.4 are done, and `@rn-forge/ng-tailwind` releases with the group.
- F14.1, F14.2, F15.1 and F16.1 are done, and the ADR-0004 amendment is accepted (done 2026-10-24).
- The two owner checks above have run and passed, or the owner has waived them.
- The tag exists and the GitHub Release exists with both tarballs.
- `CHANGELOG.md` has an entry for the version.
- `verify-consumer` passes on the released tarballs.
