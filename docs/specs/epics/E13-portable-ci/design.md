# E13 design — Portable CI

[Back to E13](index.md)

## Principles

Every feature in E13 follows these. A change that breaks one records why in the feature's Design.

1. **Discover, don't name.** No workflow, template script or shared config lists a project. Nx answers "which projects": `nx affected` for what changed, `nx run-many -t <target>` for everything that declares a target, `nx show projects -p tag:publishable` for what releases.
2. **A declaration turns a job on.** A project takes part in packing, consumer verification, API docs or Storybook by declaring that target. A job whose target no project declares does nothing and passes.
3. **One required check.** `ci-ok` aggregates every job. Branch protection requires it and nothing else, so it survives projects being added and jobs being skipped.
4. **Checks before anything public.** Nothing is pushed, tagged or released until every check that will ever run on it has passed.
5. **The published release is the record.** A version counts as shipped when its GitHub Release is published with its assets. A tag alone does not count, and a rerun finishes a half-done release instead of starting a new one.
6. **Verify what consumers get.** After a release, CI installs the assets consumers download, not the local build.
7. **Template plumbing is separate from repository tooling.** Template files live in `.github/`, `.nx/workflows/` and `tools/ci/`. Repository-specific tooling stays in `tools/scripts/` and is reached through an Nx target, never called from a workflow.
8. **Pinned, bounded, cancellable.** Every third-party action is pinned to a commit SHA with its version in a trailing comment; every job has `timeout-minutes`; superseded pull-request runs are cancelled, pushes and releases never are.

## Template-owned and repository-owned

**Template-owned** — identical in every repository that uses the template; carries the marker from [F13.5](F13.5-template-contract.md):

| File                                       | Role                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| `.github/actions/setup/action.yml`         | pnpm, Node, optional `nx start-ci-run`, `pnpm install --frozen-lockfile`             |
| `.github/workflows/ci.yml`                 | `ci-cloud`/`ci-local`, `sonar`, `package`, `docs`, `template`, `ci-ok`               |
| `.github/workflows/release.yml`            | Gate, version, verify, push, release, publish, rolling `latest`, `published-install` |
| `.github/dependabot.yml`                   | Weekly grouped `github-actions` updates                                              |
| `.nx/workflows/agents.yaml`                | Nx Cloud launch template `linux-medium`                                              |
| `tools/ci/resolve-dist-workspace-deps.mjs` | Rewrites `workspace:` ranges in one dist manifest                                    |
| `tools/ci/verify-dist-manifest.mjs`        | Checks one dist manifest                                                             |
| `tools/ci/assemble-site.mjs`               | Builds `dist/site/` from the projects that declare doc targets                       |
| `tools/ci/release-notes.mjs`               | Prints one version's section of `CHANGELOG.md`                                       |
| `tools/ci/check-template.mjs`              | Fails when a template file contains a repository-specific value                      |

**Repository-owned** — what a repository declares so the template can run:

| Declaration                                                                                                                                                                                                      | Used by                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `package.json#packageManager` (pnpm version)                                                                                                                                                                     | setup action, Nx Cloud agents    |
| `.nvmrc` (Node version)                                                                                                                                                                                          | setup action                     |
| `nx.json#nxCloudId`                                                                                                                                                                                              | `ci-cloud`                       |
| `nx.json#release`: `projects: ["tag:publishable"]`, `version.preVersionCommand` (`pnpm exec nx run-many -t build patch-package-exports -p tag:publishable`), `changelog.workspaceChangelog.createRelease: false` | `release.yml`                    |
| `nx.json#targetDefaults` for `pack` (depends on `build`) and `verify-dist` (depends on `pack`, uncached)                                                                                                         | `package`, `release.yml`         |
| Project tag `publishable`, and `"pack": {}` and `"verify-dist": {}` on each publishable project                                                                                                                  | `package`, `release.yml`         |
| Targets `lint`, `test` (writes lcov under `coverage/{projectName}/`), `build`, `e2e` (the Playwright plugin's `e2e-ci` for the cloud path)                                                                       | `ci-cloud`, `ci-local`, `sonar`  |
| Optional targets, declared per project: `verify-consumer`, `patch-package-exports`, `compodoc` (output `dist/compodoc/{projectName}`), `build-storybook` (output `dist/storybook/{projectName}`)                 | `package`, `release.yml`, `docs` |
| The implementation behind `verify-consumer` (here `tools/scripts/verify-consumer.mjs`) and any other repository tooling, reached only through its Nx target                                                      | `verify-consumer` target         |
| `sonar-project.properties`: project key, organization, sources, exclusions; no coverage paths                                                                                                                    | `sonar`                          |
| Repository variables `USE_NX_CLOUD`, `NX_CLOUD_AGENTS`; secrets `NX_CLOUD_ACCESS_TOKEN`, `SONAR_TOKEN`                                                                                                           | `ci.yml`                         |
| A `CHANGELOG.md` kept by `nx release`                                                                                                                                                                            | `release-notes.mjs`              |

`preVersionCommand`: `pnpm exec nx run-many -t build patch-package-exports -p tag:publishable`.

**Assumed:** one fixed release group ([ADR-0003](../../../adr/ADR-0003.md)), tag pattern `v{version}`, tarballs on GitHub Releases, GitHub Actions. Independent versioning is out of scope; the release job fails loudly if `HEAD` carries more than one release tag.

## Target workflow shape

```text
ci.yml   (push and pull_request on main, release/**; workflow_dispatch)
  ci-cloud | ci-local    nx affected -t lint test build e2e(-ci)
  sonar                  nx run-many -t test; discovered lcov; quality-gate wait   (needs a green ci-*)
  package                nx run-many -t pack verify-dist verify-consumer           (needs a green ci-*)
  docs                   push to main only: run-many -t compodoc build-storybook; assemble-site; deploy Pages
  template               check-template.mjs: no repository value in a template file
  ci-ok                  fails if any job failed or was cancelled, or neither ci-* succeeded

release.yml   (workflow_dispatch: specifier, exact-version, dist-tag, dry-run, first-release)
  release
    1. gate          ci.yml concluded success for this SHA (a dry run warns instead)
    2. resume?       HEAD carries a pushed v* tag with no published release →
                     nx run-many -t pack verify-dist verify-consumer (with deps), skip to 6
    3. version       nx release <spec> --skip-publish   (local commit + tag; no push, no GitHub Release)
    4. verify        nx run-many -t verify-dist verify-consumer, then pack (all --excludeTaskDependencies)
    5. push          git push --atomic origin HEAD:<branch> <tag>
    6. release       gh release create <tag> dist/tarballs/*.tgz --notes-file <release-notes.mjs output>
    7. publish       nx release publish --tag=<dist-tag> --excludeTaskDependencies   (npm dry run while disabled)
    8. latest        main only: move the tag, replace assets and notes on the existing `latest` release
  published-install  gh release download <tag> → nx run-many -t verify-consumer --excludeTaskDependencies
```
