# Release 2

**Status:** planned

[Back to releases](../index.md) · [Releasing](../../runbooks/releasing.md)

## Entry criteria

[Release 1](../release-1/index.md) has shipped (`v0.2.0`), and the owner approves.

## Scope

| Feature                                                                                                                  | Epic                                                         | Status      |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ----------- |
| [F4.3 — Accept the screen against a real backend](../../specs/epics/E4-standard-resource-screen/F4.3-wire-acceptance.md) | [E4](../../specs/epics/E4-standard-resource-screen/index.md) | in progress |

### Owner checks carried from Release 1

[F13.4](../../specs/epics/E13-portable-ci/F13.4-safe-release.md) is done; the owner deferred two of its checks to this release's cut (decision, 2026-10-16):

- S13.4.2's gate negative check: a `dry-run: false` release from a commit with no green `ci.yml` run fails at the gate before any version step.
- S13.4.4's resume rerun: delete a release's GitHub Release, keep the tag, and rerun **Release** from `main` with `dry-run: false`; it recreates the release with both tarballs and does not bump the version. Rerunning once more reports the version as already released and succeeds.

## Decisions

None yet.

## Breaking changes

None.

## Progress

F4.3's fixtures and e2e suite are written (S4.3.1–S4.3.4 and S4.3.6). S4.3.5 waits on a CI run of the e2e job on each path (owner, on GitHub). The work adds test code only; no published library changes.

## Commits

```console
$ git log --oneline -E --grep 'F4\.3|S4\.3\.[0-9]'
(not refreshed until the cut)
```

## Exit criteria

- F4.3 is done.
- The two owner checks above have run and passed, or the owner has waived them.
- The tag exists and the GitHub Release exists with both tarballs.
- `CHANGELOG.md` has an entry for the version.
- `verify-consumer` passes on the released tarballs.
