# CI template

Which CI files are portable and what a repository must declare for them to work. The files in [Template-owned files](#template-owned-files) name no project, so they can be copied into another Nx library workspace unchanged; everything they need comes from [the repository's declarations](#repository-owned-declarations). How the pipeline behaves is in [Release pipeline](release-pipeline.md).

## Rules the template follows

1. **Discover, don't name.** No workflow, template script or shared config lists a project. Nx answers "which projects": `nx affected` for what changed, `nx run-many -t <target>` for everything that declares a target, `nx show projects -p tag:publishable` for what releases.
2. **A declaration turns a job on.** A project takes part in packing, consumer verification, API docs or Storybook by declaring that target. A job whose target no project declares does nothing and passes.
3. **One required check.** `ci-ok` aggregates every job. Branch protection requires it and nothing else, so it survives projects being added and jobs being skipped.
4. **Checks before anything public.** Nothing is pushed, tagged or released until every check that will ever run on it has passed.
5. **The published release is the record.** A version counts as shipped when its GitHub Release is published with its assets. A tag alone does not count, and a rerun finishes a half-done release instead of starting a new one.
6. **Verify what consumers get.** After a release, CI installs the assets consumers download, not the local build.
7. **Template plumbing is separate from repository tooling.** Template files live in `.github/`, `.nx/workflows/` and `tools/ci/`. Repository-specific tooling stays in `tools/scripts/` and is reached through an Nx target, never called from a workflow.
8. **Pinned, bounded, cancellable.** Every third-party action is pinned to a commit SHA with its version in a trailing comment; every job has `timeout-minutes`; superseded pull-request runs are cancelled, pushes and releases never are.

## Template-owned files

Each carries the marker `ci-template: repository-agnostic` on its first line (second, after a shebang), and none contains a repository-specific value ([How to check a copy](#how-to-check-a-copy)).

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

One known exception: the Nx Cloud image in `.nx/workflows/agents.yaml` (`ubuntu22.04-node24.14-v1`) names the Node version. Nx Cloud selects a prebuilt image by name, so it cannot follow `.nvmrc`, and the whole-token check does not catch a version inside a longer identifier. A repository on a different Node major edits that one line.

## Repository-owned declarations

What a repository supplies so the template files can run.

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
| Variable `RELEASE_APP_ID` and secret `RELEASE_APP_PRIVATE_KEY` (repository or organization level): the release GitHub App                                                                                        | `release.yml`                    |
| A `CHANGELOG.md` kept by `nx release`                                                                                                                                                                            | `release-notes.mjs`              |

The release push and tag pushes run as a GitHub App, through a token from `actions/create-github-app-token`; `gh` calls (releases, run lookup) still use `GITHUB_TOKEN`.

## Assumptions

- One fixed release group ([ADR-0003](../adr/ADR-0003.md)) and tags of the form `v{version}`. Independent versioning is not supported; the release job fails when `HEAD` carries more than one `v*` tag.
- Libraries are released as tarballs on GitHub Releases; npm publishing is a dry run while disabled.
- GitHub Actions, GitHub Pages and pnpm.

## One-time repository setup

- **Pages.** Settings, Pages, Source: **GitHub Actions**. The `docs` job deploys from `main`.
- **Required check.** Branch protection (or rulesets) on `main` and `release/**` requires the `ci-ok` status check and nothing else.
- **Release push.** Create a GitHub App with Contents read & write, install it on the repository, and add it as an `Always` bypass actor on any ruleset that blocks direct pushes. Declare `RELEASE_APP_ID` and `RELEASE_APP_PRIVATE_KEY` at organization or repository level. Use no deploy key or personal access token (organization policy may disallow deploy keys).
- **Variables.** `RELEASE_APP_ID` for `release.yml`; `USE_NX_CLOUD` (set to `false` to run `ci-local` instead of `ci-cloud`; unset means Nx Cloud) and `NX_CLOUD_AGENTS` (agent count; optional, default 3).
- **Secrets.** `NX_CLOUD_ACCESS_TOKEN` for `ci-cloud`, `SONAR_TOKEN` for `sonar`, `RELEASE_APP_PRIVATE_KEY` for `release.yml`.

## How to check a copy

- **Marker.** `rg -l --hidden --glob '!.git' --glob '!docs/**' 'ci-template: repository-agnostic' .` lists exactly the files in the table above.
- **Values.** `node tools/ci/check-template.mjs` lists the marked files and fails, naming `file:line: token`, when one holds a project name or root, a project's package name, the repository name, the Nx Cloud id, the Node or pnpm version, or the Sonar key or organization. Tokens match whole words only. The workspace root project's root `.` is not a token, but its name is. `GITHUB_REPOSITORY` contributes both `owner/name` and `name`; without it the check uses the workspace directory's name. CI runs it as the `template` job.
- **Workflows.** `actionlint` over `.github/workflows/`.
- **Drift.** Compare each template file byte for byte with its source (`diff`, or `cmp`).
