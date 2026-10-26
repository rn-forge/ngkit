# Release 2

**Status:** shipped (2026-10-25)

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

[F13.4](../../specs/epics/E13-portable-ci/F13.4-safe-release.md) is done; the owner deferred two of its checks to this release's cut (decision, 2026-10-16). Both ran on 2026-10-26 and passed:

- S13.4.2's gate negative check: a `dry-run: false` release from a commit with no green `ci.yml` run fails at the gate before any version step. Passed: run `40253665800`, dispatched with `dry-run: false` from the throwaway branch `chore/gate-check` (commit `f44a9cf`, no `ci.yml` run), failed at "Gate on a green CI run" with `No successful ci.yml run for f44a9cf…`; `published-install` was skipped and no version step ran. The branch was deleted afterwards.
- S13.4.4's resume rerun: delete a release's GitHub Release, keep the tag, and rerun **Release** from `main` with `dry-run: false`; it recreates the release with all three tarballs and does not bump the version. Rerunning once more reports the version as already released and succeeds. Passed: after deleting the `v0.3.0` GitHub Release and keeping the tag, run `40253844803` from `main` logged `Release mode: resume (v0.3.0)`, recreated the release with all three tarballs, did not bump the version, and noted `latest already points at v0.3.0`. The "already released" rerun is run `40254483995` (completed with `success`; it logged `Release mode: released (v0.3.0)` and `v0.3.0 is already released`).

## Decisions

- [ADR-0004](../../adr/ADR-0004.md): amended by [S14.1.1](../../specs/epics/E14-problem-client/F14.1-problem-types.md) so `ng/core` types the RFC 9457 members and recognizes a problem by its media type. Accepted by the owner, 2026-10-24.

## Breaking changes

None from E8, E15 or E16: a new package or new exports are not a break. Expected, from [E14](../../specs/epics/E14-problem-client/index.md) ([S14.2.1](../../specs/epics/E14-problem-client/F14.2-crud-adoption.md)):

- `@rn-forge/ng/crud`: `ProblemDetails` and `problemOf` are removed (use `Problem` and `problemOf` from `@rn-forge/ng/core`); `problemToFormErrors` and `crudErrorKind` take the `HttpErrorResponse`, not a bare body; a problem is recognized by the `application/problem+json` media type, not by body shape.

## Progress

Shipped as `v0.3.0` on 2026-10-25. Nothing remains. All scope is done: F4.3 (2026-10-17), E8 (F8.1–F8.4, 2026-10-24), E14 (F14.1, F14.2), E15 (F15.1) and E16 (F16.1) (all 2026-10-24). The two owner checks carried from Release 1 ran on 2026-10-26 and passed.

## Commits

```console
$ git log --oneline -E --grep 'F4\.3|S4\.3\.[0-9]|F8\.[0-9]|S8\.[0-9]\.[0-9]|F1[456]\.[0-9]|S1[456]\.[0-9]\.[0-9]'
59da8d0 feat!: Release 2 - @rn-forge/ng-tailwind, RFC 9457 problems, event streams and invalidation
0476583 Release 2: move E5 and F11.1 to Release 3
4700b17 S8.4.3
4e11a2e S8.4.2
5edba13 S8.4.1
625613c S8.3.1
71ede6e S8.2.4
0822d4a S8.2.3
9ff00d2 S8.2.2
34f5eec S8.1.3
4502741 S8.1.2
851cb57 S8.1.1
d71945c S14.2.2
8d8cf4e S14.2.1
68db54a S14.1.2 S14.1.3 S14.1.4
0bca57e S14.1.1
c4a284c S15.1.1 S15.1.2 S15.1.3 S15.1.4
63bdd76 S16.1.2
ca4adc7 S16.1.1
1fc3c8d F4.3
2bd6579 S4.3.5
4be70c3 Merge pull request #12 from rn-forge/feature/release-1
cada717 Defer F4.3 to Release 2; mark Release 1 ready to cut
c9a9849 S4.3.6
22eb093 S4.3.5
6b8f4eb S4.3.4
114a770 S4.3.3
c2ccce7 S4.3.2
d2f8d47 S4.3.1
```

## Exit criteria

- F4.3 is done.
- F8.1–F8.4 are done, and `@rn-forge/ng-tailwind` releases with the group.
- F14.1, F14.2, F15.1 and F16.1 are done, and the ADR-0004 amendment is accepted (done 2026-10-24).
- The two owner checks above have run and passed, or the owner has waived them. Met: both passed on 2026-10-26.
- The tag exists and the GitHub Release exists with all three tarballs. Met: `v0.3.0` with `rn-forge-ng-0.3.0.tgz`, `rn-forge-ng-bootstrap-0.3.0.tgz` and `rn-forge-ng-tailwind-0.3.0.tgz`.
- `CHANGELOG.md` has an entry for the version. Met: the `0.3.0` entry lists the features and the `ng/crud` breaking change.
- `verify-consumer` passes on the released tarballs. Met: `published-install` succeeded in Release run `40246777598`.

## Shipped

| Version  | Date       | Release                                                         | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------- | ---------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `v0.3.0` | 2026-10-25 | [v0.3.0](https://github.com/rn-forge/ngkit/releases/tag/v0.3.0) | PR #14 merged (merge commit `30d3f5e`). The release commit is `2fde203` (`chore(release): publish 0.3.0`); the `v0.3.0` tag and the rolling `latest` release both point at it. A dry run (run `40245253590`) preceded the real Release run `40246777598` from `main` (`dry-run: false`): `release` and `published-install` succeeded. The GitHub Release has `rn-forge-ng-0.3.0.tgz`, `rn-forge-ng-bootstrap-0.3.0.tgz` and `rn-forge-ng-tailwind-0.3.0.tgz`; in the tarball, `ng-bootstrap`'s peer `@rn-forge/ng` is pinned exactly to `0.3.0`. `libs/*/package.json` on `main` are at `0.3.0`. The owner checks above ran on 2026-10-26. |
