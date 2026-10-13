# E13 — Portable CI

**Status:** in progress · **Owner:** ngkit · **Release:** [Release 1](../../../releases/release-1/index.md)

**Source:** owner decision, 2026-09-28.

ngkit's CI names its projects: `ng`, `ng-bootstrap` and `ng-demo` appear in `ci.yml`, `release.yml`, `pages.yml`, `nx.json`, `sonar-project.properties` and `tools/scripts/verify-dist-manifests.mjs`. Adding a publishable library means editing all of them by hand, and the lists already disagree (`ng`'s `pack` skips the workspace-dependency rewrite that `ng-bootstrap`'s runs). The release workflow also makes a version public before checking it.

This epic turns the CI into a **repository-agnostic template**. The template's files name no project and hold no value specific to this repository. Nx's project graph decides what runs: a project takes part in a job by declaring the target, and joins a release by carrying the `publishable` tag. The template files can then be copied unchanged into any Nx library workspace that declares the same inputs, and a copy can be compared against its source to detect drift.

[Back to the board](../../index.md)

The target shape, the template/repository split and the principles every feature follows are in [design.md](design.md).

| Feature                                                     | Status      | Scope                                                                                                                                      |
| ----------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [F13.1 — Discovered projects](F13.1-discovered-projects.md) | done        | The `publishable` tag, target-driven `pack`/`verify-dist`, discovered coverage; no project name in CI, `nx.json` release config or scripts |
| [F13.2 — One gate](F13.2-one-gate.md)                       | done        | Composite setup action, `ci-ok` as the one required check, the Sonar guard and quality-gate wait, generic Nx Cloud agents                  |
| [F13.3 — Docs job](F13.3-docs-job.md)                       | in progress | `pages.yml` becomes a `docs` job in `ci.yml`, after the checks pass, assembled from the projects that declare doc targets                  |
| [F13.4 — Safe release](F13.4-safe-release.md)               | planned     | Release requires a green CI run, verifies before pushing, treats the published release as the record, and checks the published assets      |
| [F13.5 — Template contract](F13.5-template-contract.md)     | planned     | Template-file marker, the portability check, and the architecture page that states what a repository must declare                          |

**Order.** F13.1 first: every other feature consumes its discovery. F13.2 and F13.3 can follow in either order. F13.4 needs F13.1 and F13.2 (`ci-ok`). F13.5 closes the epic.

**Relationship to E11.** F11.2's `setup-ci` and `setup-release` generators, when elaborated, would write this epic's template files into a workspace. This epic does not depend on E11 and does not elaborate it.

## Acceptance

E13 is done when every feature's acceptance block passes. This block re-proves the epic end to end.

```bash
set -euo pipefail
absent() { local rc=0; rg -q --hidden --glob '!.git' "$@" </dev/null || rc=$?; [ "$rc" -eq 1 ]; }
# F13.5's portability check covers F13.1–F13.4's file changes.
absent -e 'ng-bootstrap|ng-demo|@rn-forge|rn-forge-ng|libs/ng|ngkit' \
  .github .nx/workflows tools/ci
actionlint .github/workflows/*.yml
test ! -e .github/workflows/pages.yml
pnpm exec nx run-many -t pack verify-dist verify-consumer
[ "$(pnpm exec nx show projects --with-target pack --json | jq -c 'sort')" = \
  "$(pnpm exec nx show projects -p tag:publishable --json | jq -c 'sort')" ]
```

Not scriptable, checked on GitHub: a pull-request run where `ci-ok` passes; a push to `main` that deploys the docs site; a `dry-run: false` release that completes (F13.4); branch protection requiring only `ci-ok`.
